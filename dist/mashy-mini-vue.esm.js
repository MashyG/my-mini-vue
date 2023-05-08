var ShapeFlags;
(function (ShapeFlags) {
    ShapeFlags[ShapeFlags["ELEMENT"] = 1] = "ELEMENT";
    ShapeFlags[ShapeFlags["STATEFUL_COMPONENT"] = 2] = "STATEFUL_COMPONENT";
    ShapeFlags[ShapeFlags["TEXT_CHILDREN"] = 4] = "TEXT_CHILDREN";
    ShapeFlags[ShapeFlags["ARRAY_CHILDREN"] = 8] = "ARRAY_CHILDREN";
    ShapeFlags[ShapeFlags["SLOT_CHILDREN"] = 16] = "SLOT_CHILDREN"; // 10000
})(ShapeFlags || (ShapeFlags = {}));

const Fragment = Symbol('Fragment');
const Text = Symbol('Text');
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        key: props && props.key,
        el: null,
        shapeFlags: getShapeFlag(type)
    };
    // children
    if (typeof children === 'string') {
        vnode.shapeFlags |= ShapeFlags.TEXT_CHILDREN;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlags |= ShapeFlags.ARRAY_CHILDREN;
    }
    // slots
    if (vnode.shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
        if (typeof children === 'object') {
            vnode.shapeFlags |= ShapeFlags.SLOT_CHILDREN;
        }
    }
    return vnode;
}
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}
function getShapeFlag(type) {
    return typeof type === 'string'
        ? ShapeFlags.ELEMENT
        : ShapeFlags.STATEFUL_COMPONENT;
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

const renderSlots = (slots, name, props) => {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === 'function') {
            return createVNode(Fragment, {}, slot(props));
        }
    }
};

const extend = Object.assign;
const EMPTY_OBJECT = {};
const isObject = (val) => {
    return val !== null && typeof val === 'object';
};
const hasChanged = (oldVal, newVal) => {
    return !Object.is(oldVal, newVal);
};
const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : '';
    });
};
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
const toHandlerKey = (str) => {
    return str ? 'on' + capitalize(str) : '';
};

// 用于存储所有的 effect 对象
function createDep(effects) {
    const dep = new Set(effects);
    return dep;
}

// 全局变量存储 ReactiveEffect 实例对象，用于调用 fn
let activeEffect;
let shouldTack;
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.scheduler = scheduler;
        this.deps = []; // 所有的依赖 dep
        this.active = true;
        this._fn = fn;
    }
    run() {
        if (!this.active) {
            return this._fn();
        }
        shouldTack = true;
        activeEffect = this; // 暂存实例，触发依赖或暂停相应时调用
        const result = this._fn();
        shouldTack = false;
        return result;
    }
    stop() {
        if (this.active) {
            cleanupEffect(this);
            this.onStop && this.onStop();
            this.active = false;
        }
    }
}
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
// 收集依赖
// target 容器
const targetMap = new Map();
function track(target, key) {
    if (!isTacking())
        return;
    // target 容器
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    // key 容器
    let dep = depsMap.get(key);
    if (!dep) {
        dep = createDep();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
}
function trackEffects(dep) {
    // 看看 dep 之前有没有添加过，若有，则不添加了
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect);
        // activeEffect.deps 用于之后清除 dep 工作，所以暂存一下
        activeEffect.deps.push(dep);
    }
}
function isTacking() {
    return shouldTack && activeEffect !== undefined;
}
// 触发依赖
function trigger(target, key) {
    const depsMap = targetMap.get(target);
    if (!depsMap)
        return;
    const dep = depsMap.get(key);
    triggerEffects(dep);
}
function triggerEffects(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}
function effect(fn, options) {
    const { scheduler } = options || {};
    // 调用 fn
    const _effect = new ReactiveEffect(fn, scheduler);
    extend(_effect, options);
    _effect.run();
    // 内部存在 this，所以需要绑定当前实例 _effect
    const runner = _effect.run.bind(_effect);
    // 将实例对象暂存起来，便于后续使用 effect
    runner.effect = _effect;
    return runner;
}

const createGetter = (isReadonly = false, shallow = false) => {
    return function get(target, key) {
        if (ReactiveFlags.IS_REACTIVE === key) {
            return !isReadonly;
        }
        else if (ReactiveFlags.IS_READONLY === key) {
            return isReadonly;
        }
        const res = Reflect.get(target, key);
        if (shallow) {
            return res;
        }
        // 嵌套对象处理：判断 res 是否 Object
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        if (!isReadonly) {
            // 收集依赖
            track(target, key);
        }
        return res;
    };
};
const createSetter = () => {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        // 触发依赖
        trigger(target, key);
        return res;
    };
};
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
const mutableHandlers = {
    get,
    set
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key, value) {
        // 抛出错误
        console.warn(`key: ${key} set 失败，target is readonly！target: ${target}`);
        return true;
    }
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet
});

var ReactiveFlags;
(function (ReactiveFlags) {
    ReactiveFlags["IS_REACTIVE"] = "__v_isReactive";
    ReactiveFlags["IS_READONLY"] = "__v_isReadonly";
})(ReactiveFlags || (ReactiveFlags = {}));
const createReactiveObject = (raw, baseHandlers = mutableHandlers) => {
    if (!isObject(raw)) {
        console.warn(`target ${raw} 必须是对象`);
        return raw;
    }
    return new Proxy(raw, baseHandlers);
};
function reactive(raw) {
    return createReactiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    return createReactiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    return createReactiveObject(raw, shallowReadonlyHandlers);
}

class RefImpl {
    constructor(value) {
        this.__v_isRef = true;
        this._rawValue = value;
        // 如果 value 是对象，则需要进行 reactive 处理
        this._value = convert(value);
        this.dep = createDep();
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(newVal) {
        // 值不同时才触发
        // 当对比的值时对象时，需要取原有的值对比，因为对象会转为 proxy
        if (hasChanged(newVal, this._rawValue)) {
            this._rawValue = newVal;
            this._value = convert(newVal);
            triggerRefValue(this);
        }
    }
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function triggerRefValue(ref) {
    triggerEffects(ref.dep);
}
function trackRefValue(ref) {
    if (isTacking()) {
        trackEffects(ref.dep);
    }
}
function ref(value) {
    return new RefImpl(value);
}
function isRef(ref) {
    return !!ref.__v_isRef;
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
const shallowUnwrapHandlers = {
    get(target, key, receiver) {
        // 如果里面是一个 ref 类型的话，那么就返回 .value
        // 如果不是的话，那么直接返回value 就可以了
        return unRef(Reflect.get(target, key, receiver));
    },
    set(target, key, value, receiver) {
        const oldValue = target[key];
        if (isRef(oldValue) && !isRef(value)) {
            return (target[key].value = value);
        }
        return Reflect.set(target, key, value, receiver);
    }
};
function proxyRefs(ref) {
    return new Proxy(ref, shallowUnwrapHandlers);
}

function emit(instance, event, ...args) {
    const { props } = instance || {};
    // 处理 event 事件名称（驼峰名称，事件首字母大写）
    // 然后从 props 中获取相应的 emit 方法进行调用
    const handlerName = toHandlerKey(camelize(event));
    const func = props === null || props === void 0 ? void 0 : props[handlerName];
    func && func(...args);
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
    // TODO 处理 attrs
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots
};
const publicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance || {};
        if (hasOwn(setupState, key)) {
            return setupState[key] || '';
        }
        else if (hasOwn(props, key)) {
            return props[key] || '';
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    }
};

const normalizeSlotValue = (value) => {
    return Array.isArray(value) ? value : [value];
};
const normalizeObjectSlots = (children, slots) => {
    for (const key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
};
function initSlots(instance, children) {
    const { vnode } = instance || {};
    if (vnode.shapeFlags & ShapeFlags.SLOT_CHILDREN) {
        normalizeObjectSlots(children, instance.slots);
    }
}

function createComponentInstance(vnode, parent) {
    var _a;
    const instance = {
        vnode,
        type: (_a = vnode === null || vnode === void 0 ? void 0 : vnode.type) !== null && _a !== void 0 ? _a : '',
        setupState: {},
        props: {},
        slots: {},
        provides: parent ? parent.provides : {},
        parent,
        isMounted: false,
        subTree: {},
        emit: () => { }
    };
    instance.emit = emit.bind(null, instance);
    return instance;
}
function setupComponent(instance) {
    const { vnode } = instance || {};
    const { props, children } = vnode || {};
    initProps(instance, props);
    initSlots(instance, children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    console.log('setupStatefulComponent ----- instance  >>>>', instance);
    // 初始化 ctx
    instance.proxy = new Proxy({ _: instance }, publicInstanceProxyHandlers);
    const { type: component, props, emit } = instance || {};
    const { setup } = component || {};
    if (setup) {
        setCurrentInstance(instance);
        // setupResult => function or object
        const setupResult = setup(shallowReadonly(props), {
            emit
        });
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    console.log('handleSetupResult ----- instance  >>>>', instance);
    // TODO function 处理
    if (typeof setupResult === 'object') {
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const { type: component } = instance || {};
    const { render } = component || {};
    if (render) {
        instance.render = render;
    }
}
let currentInstance = null;
const setCurrentInstance = (instance) => {
    currentInstance = instance;
};
const getCurrentInstance = () => {
    return currentInstance;
};

// 存值
const provide = (key, value) => {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides, parent } = currentInstance || {};
        let { provides: parentProviders } = parent || {};
        if (provides === parentProviders) {
            // 通过原型链的方式获取值：当前没有相应 key 值时往上（prototype）找
            provides = currentInstance.provides = Object.create(parentProviders);
        }
        provides[key] = value;
    }
};
// 取值
const inject = (key, defaultValue) => {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const { parent } = currentInstance || {};
        let { provides: parentProviders } = parent || {};
        if (key in parentProviders) {
            return parentProviders[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === 'function') {
                return defaultValue();
            }
            return defaultValue;
        }
    }
};

function createAppApi(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                console.log('mount ----- rootContainer  >>>>', rootContainer);
                // 先转化为 vnode：component -> vnode
                // 所有逻辑操作都会基于 vnode 做处理
                const vnode = createVNode(rootComponent);
                console.log('mount ----- vnode  >>>>', vnode);
                render(vnode, rootContainer);
            }
        };
    };
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProps: hostPatchProps, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText } = options || {};
    function render(vnode, rootContainer) {
        // patch
        patch(null, vnode, rootContainer, null, null);
    }
    // n1 旧节点；n2 新节点
    function patch(n1, n2, container, parentComponent, anchor) {
        console.log('patch ----- n1, n2  >>>>', n1, n2);
        const { type = '', shapeFlags } = n2 || {};
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent, anchor);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlags & ShapeFlags.ELEMENT) {
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                break;
        }
    }
    // 处理 Fragment 节点
    function processFragment(n1, n2, container, parentComponent, anchor) {
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    // 处理 Text 节点
    function processText(n1, n2, container) {
        const { children } = n2 || {};
        const textVNode = (n2.el = document.createTextNode(children));
        container.append(textVNode);
    }
    // 处理 Element 类型
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    // 初始化 Element
    function mountElement(vnode, container, parentComponent, anchor) {
        console.log('processElement ----- vnode  >>>>', vnode);
        const { type, children, props, shapeFlags } = vnode || {};
        // createElement
        const el = (vnode.el = hostCreateElement(type));
        // children -> String, Array<vnode>
        if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
            el.textContent = children;
        }
        else if (shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
            mountChildren(children, el, parentComponent, anchor);
        }
        // props
        for (const key in props) {
            const val = props[key];
            // patchProps
            console.log('patchProps ========= val ----', props, val);
            hostPatchProps(el, key, null, val);
        }
        // insert
        hostInsert(el, container, anchor);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        children === null || children === void 0 ? void 0 : children.forEach((v) => {
            patch(null, v, container, parentComponent, anchor);
        });
    }
    // 更新 Element
    function patchElement(n1, n2, container, parentComponent, anchor) {
        console.log('patchElement ==== n1, n2 >>>>>', n1, n2);
        const oldProps = n1.props || EMPTY_OBJECT;
        const newProps = n2.props || EMPTY_OBJECT;
        const el = (n2.el = n1.el);
        patchProps(el, oldProps, newProps);
        patchChildren(n1, n2, el, parentComponent, anchor);
    }
    // 对比 props
    function patchProps(el, oldProps, newProps) {
        if (oldProps !== newProps) {
            for (const key in newProps) {
                const prevProps = oldProps[key];
                const nextProps = newProps[key];
                if (prevProps !== nextProps) {
                    hostPatchProps(el, key, prevProps, nextProps);
                }
            }
            if (oldProps !== EMPTY_OBJECT) {
                for (const key in oldProps) {
                    const prevProps = oldProps[key];
                    if (!(key in newProps)) {
                        hostPatchProps(el, key, prevProps, null);
                    }
                }
            }
        }
    }
    // 对比 children
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const { shapeFlags: prevShapeFlags, children: prevChildren } = n1 || {};
        const { shapeFlags: nextShapeFlags, children: nextChildren } = n2 || {};
        if (nextShapeFlags & ShapeFlags.TEXT_CHILDREN) {
            // 新节点为 Text
            if (prevShapeFlags & ShapeFlags.ARRAY_CHILDREN) {
                // 旧节点为 Array
                // 1. 移除旧节点
                unmountChildren(prevChildren);
                hostSetElementText(container, nextChildren);
            }
            // 2. 插入新节点；
            // 两节点不一致时，替换新节点
            if (prevChildren !== nextChildren) {
                hostSetElementText(container, nextChildren);
            }
        }
        else {
            // 新节点为 Array
            if (prevShapeFlags & ShapeFlags.TEXT_CHILDREN) {
                // 旧节点为 Text
                // 1. 移除旧节点
                hostSetElementText(container, '');
                // 2. 插入新节点；
                mountChildren(nextChildren, container, parentComponent, anchor);
            }
            else {
                // 旧节点为 Array
                patchKeyedChildren(prevChildren, nextChildren, container, parentComponent, anchor);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        const l2 = c2.length;
        let i = 0;
        let e1 = c1.length - 1;
        let e2 = l2 - 1;
        function isSomeVNodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key;
        }
        // 1. 左侧开始对比
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            if (isSomeVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            i++;
        }
        // 2. 右侧开始对比
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSomeVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        // 3. 新的比旧的多 -> 创建
        if (i > e1) {
            if (i <= e2) {
                // 如果是这种情况的话就说明 e2 也就是新节点的数量大于旧节点的数量
                // 也就是说新增了 vnode
                // 应该循环 c2
                // 锚点的计算：新的节点有可能需要添加到尾部，也可能添加到头部，所以需要指定添加的问题
                // 要添加的位置是当前的位置(e2 开始)+1
                // 因为对于往左侧添加的话，应该获取到 c2 的第一个元素
                // 所以我们需要从 e2 + 1 取到锚点的位置
                const nextPos = e2 + 1;
                const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor;
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor);
                    i++;
                }
            }
        }
        else if (i > e2) {
            // 3. 旧的比新的多 -> 删除
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        else {
            // 6,7 中间对比
            const s1 = i;
            const s2 = i;
            // 需要处理的节点
            const toBePatched = e2 - s2 + 1;
            // 处理过的节点
            let patched = 0;
            // 新节点的映射表
            const key2NewIndexMap = new Map();
            // 是否需要移动
            let moved = false;
            let maxNewIndexSoFar = 0;
            // 先把 key 和 newIndex 绑定好，方便后续基于 key 找到 newIndex
            // 时间复杂度是 O(1)
            // 遍历新节点，得出映射关系
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i] || {};
                key2NewIndexMap.set(nextChild.key, i);
            }
            // 初始化 从新的index映射为老的index
            // 创建数组的时候给定数组的长度，这个是性能最快的写法
            // 新节点针对旧节点的映射表
            const newIndex2OldIndexMap = new Array(toBePatched);
            // 初始化为 0 , 后面处理的时候 如果发现是 0 的话，那么就说明新值在老的里面不存在
            for (let i = 0; i < toBePatched; i++) {
                newIndex2OldIndexMap[i] = 0;
            }
            // 遍历旧节点，判断 key 是否能找到 newIndex，或者遍历新节点来判断是否存在于旧节点中
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i] || {};
                // 优化点
                // 如果老的节点大于新节点的数量的话，那么这里在处理老节点的时候就直接删除即可
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el);
                    continue;
                }
                let newIndex;
                if (prevChild.key != null) {
                    // 通过映射表选取
                    // 时间复杂度O(1)
                    newIndex = key2NewIndexMap.get(prevChild.key);
                }
                else {
                    // 通过遍历新节点
                    // 时间复杂度O(n)
                    for (let j = s2; j <= e2; j++) {
                        if (isSomeVNodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                // 是否存在旧节点
                if (newIndex === undefined) {
                    // 不存在则删除
                    hostRemove(prevChild.el);
                }
                else {
                    // 把新节点的索引和老的节点的索引建立映射关系
                    // i + 1 是因为 i 有可能是0 (0 的话会被认为新节点在老的节点中不存在)
                    newIndex2OldIndexMap[newIndex - s2] = i + 1;
                    // 来确定中间的节点是不是需要移动
                    // 新的 newIndex 如果一直是升序的话，那么就说明没有移动
                    // 所以我们可以记录最后一个节点在新的里面的索引，然后看看是不是升序
                    // 不是升序的话，我们就可以确定节点移动过了
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    patched++;
                }
            }
            // 利用最长递增子序列来优化移动逻辑
            // 因为元素是升序的话，那么这些元素就是不需要移动的
            // 而我们就可以通过最长递增子序列来获取到升序的列表
            // 在移动的时候我们去对比这个列表，如果对比上的话，就说明当前元素不需要移动
            // 通过 moved 来进行优化，如果没有移动过的话 那么就不需要执行算法
            // getSequence 返回的是 newIndexToOldIndexMap 的索引值
            // 所以后面我们可以直接遍历索引值来处理，也就是直接使用 toBePatched 即可
            const increasingNewIndexSequence = moved
                ? getSequence(newIndex2OldIndexMap)
                : [];
            let j = increasingNewIndexSequence.length - 1;
            // 倒序遍历，从后面开始插入，因为后面的节点已确定
            // 遍历新节点
            // 1. 需要找出老节点没有，而新节点有的 -> 需要把这个节点创建
            // 2. 最后需要移动一下位置，比如 [c,d,e] -> [e,c,d]
            // 这里倒循环是因为在 insert 的时候，需要保证锚点是处理完的节点（也就是已经确定位置了）
            // 因为 insert 逻辑是使用的 insertBefore()
            for (let i = toBePatched - 1; i >= 0; i--) {
                // 确定当前要处理的节点索引
                const nextIndex = i + s2;
                const nextChild = c2[nextIndex];
                // 锚点等于当前节点索引+1
                // 也就是当前节点的后面一个节点(又因为是倒遍历，所以锚点是位置确定的节点)
                const nextPos = nextIndex + 1;
                const anchor = nextPos < l2 ? c2[nextPos].el : null;
                if (newIndex2OldIndexMap[i] === 0) {
                    // 说明新节点在老的里面不存在，需要创建
                    patch(null, nextChild, container, parentComponent, anchor);
                }
                else if (moved) {
                    // 需要移动
                    // 1. j 已经没有了 说明剩下的都需要移动了
                    // 2. 最长子序列里面的值和当前的值匹配不上， 说明当前元素需要移动
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
                        // 这里就是命中了  index 和 最长递增子序列的值
                        // 所以可以移动指针了
                        j--;
                    }
                }
            }
        }
    }
    function unmountChildren(children) {
        (children || []).forEach((child) => {
            const { el } = child || {};
            hostRemove(el);
        });
    }
    // 处理组件类型
    function processComponent(n1, n2, container, parentComponent, anchor) {
        console.log('processComponent ----- n2  >>>>', n2);
        mountComponent(n2, container, parentComponent, anchor);
    }
    // 挂载组件
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        const instance = createComponentInstance(initialVNode, parentComponent);
        console.log('mountComponent ----- instance 111 >>>>', instance);
        setupComponent(instance);
        console.log('mountComponent ----- instance 222 >>>>', instance);
        setupRenderEffect(instance, initialVNode, container, anchor);
    }
    // 调用 render，进行拆箱操作
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        effect(() => {
            const { proxy, isMounted } = instance || {};
            if (!isMounted) {
                // subTree -> initialVNode
                const subTree = (instance.subTree = instance.render.call(proxy));
                console.log('setupRenderEffect ----- init subTree  >>>>', subTree);
                // initialVNode -> patch
                // initialVNode -> element 类型 -> mountElement 渲染
                patch(null, subTree, container, instance, anchor);
                // mount 完成之后才可以获取到虚拟 DOM 的el
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                const subTree = instance.render.call(proxy);
                const prevSubTree = instance.subTree;
                console.log('setupRenderEffect ----- update prevSubTree subTree  >>>>', prevSubTree, subTree);
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance, anchor);
            }
        });
    }
    return {
        createApp: createAppApi(render)
    };
}
// 获取最长递增子序列
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

// createElement
function createElement(type) {
    console.log('createElement ----->>>>');
    return document.createElement(type);
}
// patchProps
function patchProps(el, key, prevVal, nextVal) {
    console.log('patchProps ----->>>>');
    const isEvent = (k) => /^on[A-Z]/.test(k);
    if (isEvent(key)) {
        const event = key.slice(2).toLocaleLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
// insert
function insert(child, parent, anchor) {
    console.log('insert ----->>>>');
    // parent.append(el)
    // 将 child 添加到锚点 anchor 之前
    parent.insertBefore(child, anchor || null);
}
function remove(child) {
    const { parentNode } = child || {};
    if (parentNode) {
        parentNode.removeChild(child);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProps,
    insert,
    remove,
    setElementText
});
function createApp(...args) {
    return renderer.createApp(...args);
}

export { createApp, createRenderer, createTextVNode, getCurrentInstance, h, inject, provide, proxyRefs, ref, renderSlots };
