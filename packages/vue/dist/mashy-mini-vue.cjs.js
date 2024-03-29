'use strict';

function toDisplayString(val) {
    return String(val);
}

var ShapeFlags;
(function (ShapeFlags) {
    ShapeFlags[ShapeFlags["ELEMENT"] = 1] = "ELEMENT";
    ShapeFlags[ShapeFlags["STATEFUL_COMPONENT"] = 2] = "STATEFUL_COMPONENT";
    ShapeFlags[ShapeFlags["TEXT_CHILDREN"] = 4] = "TEXT_CHILDREN";
    ShapeFlags[ShapeFlags["ARRAY_CHILDREN"] = 8] = "ARRAY_CHILDREN";
    ShapeFlags[ShapeFlags["SLOT_CHILDREN"] = 16] = "SLOT_CHILDREN"; // 10000
})(ShapeFlags || (ShapeFlags = {}));

const extend = Object.assign;
const EMPTY_OBJECT = {};
const isObject = (val) => {
    return val !== null && typeof val === 'object';
};
const isString = (val) => typeof val === 'string';
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

const Fragment = Symbol('Fragment');
const Text = Symbol('Text');
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        component: null,
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
    $slots: (i) => i.slots,
    $props: (i) => i.props
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
        type: (_a = vnode === null || vnode === void 0 ? void 0 : vnode.type) !== null && _a !== void 0 ? _a : "",
        setupState: {},
        props: {},
        slots: {},
        next: null,
        update: null,
        provides: parent ? parent.provides : {},
        parent,
        isMounted: false,
        subTree: {},
        emit: () => { },
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
    console.log("setupStatefulComponent ----- instance  >>>>", instance);
    // 初始化 ctx
    instance.proxy = new Proxy({ _: instance }, publicInstanceProxyHandlers);
    const { type: component, props, emit } = instance || {};
    const { setup } = component || {};
    if (setup) {
        setCurrentInstance(instance);
        // setupResult => function or object
        const setupResult = setup(shallowReadonly(props), {
            emit,
        });
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    console.log("handleSetupResult ----- instance  >>>>", instance);
    // TODO function 处理
    if (typeof setupResult === "object") {
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    if (complier && !Component.render) {
        if (Component.template) {
            const template = Component.template;
            Component.render = complier(template);
        }
    }
    instance.render = Component.render;
}
let currentInstance = null;
const setCurrentInstance = (instance) => {
    currentInstance = instance;
};
const getCurrentInstance = () => {
    return currentInstance;
};
let complier;
function registerRuntimeCompiler(_complier) {
    complier = _complier;
}

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

const queue = [];
const p = Promise.resolve();
let isFlushPending = false;
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}
function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    queueFlush();
}
function queueFlush() {
    if (isFlushPending) {
        return;
    }
    isFlushPending = true;
    nextTick(flushJob);
}
function flushJob() {
    let job;
    isFlushPending = false;
    while ((job = queue.shift())) {
        job && job();
    }
}

function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps } = prevVNode || {};
    const { props: nextProps } = nextVNode || {};
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProps: hostPatchProps, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText, } = options || {};
    function render(vnode, rootContainer) {
        // patch
        patch(null, vnode, rootContainer, null, null);
    }
    // n1 旧节点；n2 新节点
    function patch(n1, n2, container, parentComponent, anchor) {
        console.log("patch ----- n1, n2  >>>>", n1, n2);
        const { type = "", shapeFlags } = n2 || {};
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
        console.log("processElement ----- vnode  >>>>", vnode);
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
            console.log("patchProps ========= val ----", props, val);
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
        console.log("patchElement ==== n1, n2 >>>>>", n1, n2);
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
                hostSetElementText(container, "");
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
                    // { 新节点索引: 旧节点索引 }
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
        console.log("processComponent ----- n2  >>>>", n2);
        if (!n1) {
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            updateComponent(n1, n2);
        }
    }
    // 挂载组件
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        // 存储 component，供后续更新组件使用
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent));
        console.log("mountComponent ----- instance 111 >>>>", instance);
        setupComponent(instance);
        console.log("mountComponent ----- instance 222 >>>>", instance);
        setupRenderEffect(instance, initialVNode, container, anchor);
    }
    // 更新组件
    function updateComponent(n1, n2) {
        const instance = (n2.component = n1.component);
        console.log("updateComponent ----- instance >>>>", instance);
        // 判断是否需要更新组件
        if (shouldUpdateComponent(n1, n2)) {
            // 暂存下次需要更新的 vnode
            instance.next = n2;
            // 这里的 update 是在 setupRenderEffect 里面初始化的，update 函数除了当内部的响应式对象发生改变的时候会调用
            // 还可以直接主动的调用(这是属于 effect 的特性)
            // 调用 update 再次更新调用 patch 逻辑
            // 在update 中调用的 next 就变成了 n2了
            // ps：可以详细的看看 update 中 next 的应用
            instance.update();
        }
        else {
            // 不需要更新的话，那么只需要覆盖下面的属性即可
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    // 调用 render，进行拆箱操作
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        // effect 返回的 runner 供后续更新组件使用
        instance.update = effect(() => {
            const { proxy, isMounted, next, vnode } = instance || {};
            if (!isMounted) {
                // subTree -> initialVNode
                const subTree = (instance.subTree = instance.render.call(proxy, proxy));
                console.log("setupRenderEffect ----- init subTree  >>>>", subTree);
                // initialVNode -> patch
                // initialVNode -> element 类型 -> mountElement 渲染
                patch(null, subTree, container, instance, anchor);
                // mount 完成之后才可以获取到虚拟 DOM 的el
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                // 需要一个待更新的 vnode
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                const subTree = instance.render.call(proxy, proxy);
                const prevSubTree = instance.subTree;
                console.log("setupRenderEffect ----- update prevSubTree subTree  >>>>", prevSubTree, subTree);
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance, anchor);
            }
        }, {
            scheduler() {
                console.log("update -  scheduler");
                // 通过微任务控制组件的更新
                queueJobs(instance.update);
            },
        });
    }
    return {
        createApp: createAppApi(render),
    };
}
function updateComponentPreRender(instance, nextVNode) {
    instance.vnode = nextVNode;
    instance.next = null;
    // props 简单实现赋值
    instance.props = nextVNode.props;
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
    console.log('createElement ----->>>> type ', type);
    return document.createElement(type);
}
// patchProps
function patchProps(el, key, prevVal, nextVal) {
    console.log('patchProps ----->>>> el, key, nextVal', el, key, nextVal);
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
    console.log('insert ----->>>> child, parent', child, parent);
    // parent.append(el)
    // 将 child 添加到锚点 anchor 之前
    parent.insertBefore(child, anchor || null);
}
function remove(child) {
    console.log('remove ----->>>> child', child);
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

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createApp: createApp,
    createElementVNode: createVNode,
    createRenderer: createRenderer,
    createTextVNode: createTextVNode,
    effect: effect,
    getCurrentInstance: getCurrentInstance,
    h: h,
    inject: inject,
    nextTick: nextTick,
    provide: provide,
    proxyRefs: proxyRefs,
    ref: ref,
    registerRuntimeCompiler: registerRuntimeCompiler,
    renderSlots: renderSlots,
    shallowReadonly: shallowReadonly,
    toDisplayString: toDisplayString
});

const TO_DISPLAY_STRING = Symbol('toDisplayString');
const CREATE_ELEMENT_VNODE = Symbol('createElementVNode');
const helperMapName = {
    [TO_DISPLAY_STRING]: 'toDisplayString',
    [CREATE_ELEMENT_VNODE]: 'createElementVNode'
};

var NodeTypes;
(function (NodeTypes) {
    NodeTypes[NodeTypes["INTERPOLATION"] = 0] = "INTERPOLATION";
    NodeTypes[NodeTypes["SIMPLE_EXPRESSION"] = 1] = "SIMPLE_EXPRESSION";
    NodeTypes[NodeTypes["ELEMENT"] = 2] = "ELEMENT";
    NodeTypes[NodeTypes["TEXT"] = 3] = "TEXT";
    NodeTypes[NodeTypes["ROOT"] = 4] = "ROOT";
    NodeTypes[NodeTypes["COMPOUND_EXPRESSION"] = 5] = "COMPOUND_EXPRESSION";
})(NodeTypes || (NodeTypes = {}));
function createVNodeCall(context, tag, props, children) {
    if (context) {
        context.helper(CREATE_ELEMENT_VNODE);
    }
    return {
        // TODO vue3 里面这里的 type 是 VNODE_CALL
        // 是为了 block 而 mini-vue 里面没有实现 block
        // 所以创建的是 Element 类型就够用了
        type: NodeTypes.ELEMENT,
        tag,
        props,
        children
    };
}

function generate(ast) {
    // console.log('ast === ', ast)
    const context = createCodegenContext();
    const { push } = context || {};
    genFunctionPreamble(ast, context);
    push('return ');
    const functionName = 'render';
    const args = ['_ctx', '_cache'];
    const signature = args.join(', ');
    push(`function ${functionName}(${signature}) {\n`);
    push(`return `);
    genNode(ast.codegenNode, context);
    push(`\n`);
    push(`}`);
    // console.log('context.code ---->>>>> ', context.code)
    return {
        code: context.code
    };
}
function createCodegenContext() {
    const context = {
        code: '',
        push(source) {
            context.code += source;
        },
        helper(key) {
            return `_${helperMapName[key]}`;
        }
    };
    return context;
}
function genFunctionPreamble(ast, context) {
    const { helpers } = ast || {};
    const { length } = helpers || [];
    if (length > 0) {
        const VueBinging = 'Vue';
        const aliasHelper = (s) => `${helperMapName[s]}: _${helperMapName[s]}`;
        context.push(`const { ${helpers.map(aliasHelper).join(', ')} } = ${VueBinging}\n`);
    }
}
function genNode(node, context) {
    // console.log('genNode === ', node)
    switch (node.type) {
        case NodeTypes.TEXT:
            genText(node, context);
            break;
        case NodeTypes.INTERPOLATION:
            genInterpolation(node, context);
            break;
        case NodeTypes.SIMPLE_EXPRESSION:
            genExpression(node, context);
            break;
        case NodeTypes.ELEMENT:
            genElement(node, context);
            break;
        case NodeTypes.COMPOUND_EXPRESSION:
            genCompoundExpression(node, context);
            break;
    }
}
// 纯字符串
function genText(node, context) {
    context.push(`'${node.content}'`);
}
// 插值
function genInterpolation(node, context) {
    const { push, helper } = context || {};
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    push(`)`);
}
// 表达式
function genExpression(node, context) {
    context.push(`${node.content}`);
}
// 标签
function genElement(node, context) {
    const { push, helper } = context || {};
    const { tag, props, children } = node || {};
    console.log('genElement -- node', node);
    push(`${helper(CREATE_ELEMENT_VNODE)}(`);
    genNodeList(genNullableArgs([tag, props, children]), context);
    push(')');
}
function genNullableArgs(args) {
    // 把末尾为null 的都删除掉
    // vue3源码中，后面可能会包含 patchFlag、dynamicProps 等编译优化的信息
    // 而这些信息有可能是不存在的，所以在这边的时候需要删除掉
    let i = args.length;
    // 这里 i-- 用的还是特别的巧妙的
    // 当为0 的时候自然就退出循环了
    while (i--) {
        if (args[i] != null)
            break;
    }
    // 把为 falsy 的值都替换成 "null"
    return args.slice(0, i + 1).map((arg) => arg || 'null');
}
function genNodeList(nodes, context) {
    const { push } = context || {};
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node);
        }
        else {
            genNode(node, context);
        }
        // node 和 node 之间需要加上 逗号(,)
        // 但是最后一个不需要 "div", [props], [children]
        if (i < node.length - 1) {
            push(', ');
        }
    }
}
// 复合类型：hi~{{data}}
function genCompoundExpression(node, context) {
    console.log('genCompoundExpression', node);
    const { push } = context || {};
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, context);
        }
    }
}

var TagTypes;
(function (TagTypes) {
    TagTypes[TagTypes["START"] = 0] = "START";
    TagTypes[TagTypes["END"] = 1] = "END";
})(TagTypes || (TagTypes = {}));
function startsWith(source, searchString) {
    return source.startsWith(searchString);
}
function baseParse(content) {
    const context = createParseContext(content);
    return createRoot(parseChildren(context, []));
}
// 根据有限状态机的原理，实现 Parse 流程
function parseChildren(context, ancestor) {
    const nodes = [];
    while (!isEnd(context, ancestor)) {
        let node;
        const s = context.source || '';
        if (startsWith(s, '{{')) {
            // 插值
            node = parseInterpolation(context);
        }
        else if (s[0] === '<') {
            // element
            if (s[1] === '/') {
                // 这里属于 edge case 可以不用关心
                // 处理结束标签
                if (/[a-z]/i.test(s[2])) {
                    // 匹配 </div>
                    // 需要改变 context.source 的值 -> 也就是需要移动光标
                    parseTag(context, TagTypes.END);
                    // 结束标签就以为这都已经处理完了，所以就可以跳出本次循环了
                    continue;
                }
            }
            else if (/[a-z]/.test(s[1])) {
                node = parseElement(context, ancestor);
            }
        }
        // text 作为默认解析
        if (!node) {
            node = parseText(context);
        }
        nodes.push(node);
    }
    return nodes;
}
// 判断是否结束
function isEnd(context, ancestor) {
    const s = context.source;
    // console.log('isEnd --- source', s)
    // console.log('isEnd --- ancestor', ancestor)
    // 遇到结束标签时，例如：</div>
    if (startsWith(s, '</')) {
        for (let i = ancestor.length - 1; i >= 0; --i) {
            if (startsWithEndTagOpen(s, ancestor[i].tag)) {
                return true;
            }
        }
    }
    // source 没有值时
    return !s;
}
// 解析插值表达式
function parseInterpolation(context) {
    // {{message}} -> message
    const openDelimiter = '{{';
    const openDelimiterLength = openDelimiter.length;
    const closeDelimiter = '}}';
    const closeDelimiterLength = closeDelimiter.length;
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiterLength);
    // console.log('closeIndex', closeIndex)
    advanceBy(context, openDelimiterLength);
    // console.log('context.source', context.source)
    const rawContentLength = closeIndex - openDelimiterLength;
    const rawContent = parseTextData(context, rawContentLength);
    const content = rawContent.trim();
    // console.log('content', content)
    advanceBy(context, closeDelimiterLength);
    // console.log('context.source', context.source)
    return {
        type: NodeTypes.INTERPOLATION,
        content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content
        }
    };
}
// 解析 Element
function parseElement(context, ancestor) {
    // 1. 解析 Tag
    const element = parseTag(context, TagTypes.START) || {};
    // 收集已解析到的 element 标签
    ancestor.push(element);
    element.children = parseChildren(context, ancestor);
    // 移除对应的 element 标签
    ancestor.pop();
    console.log('element ---- ', element);
    if (startsWithEndTagOpen(context.source, element.tag)) {
        parseTag(context, TagTypes.END);
    }
    else {
        throw new Error(`缺少结束标签：${element.tag}`);
    }
    return element;
}
function parseTag(context, type) {
    // 1. 解析 Tag
    const match = /^<\/?([a-z]*)/i.exec(context.source);
    console.log('match', match);
    const tag = match[1];
    console.log('tag', tag);
    // 2. 删除处理完的代码
    advanceBy(context, match[0].length);
    advanceBy(context, 1);
    console.log('context', context);
    if (type === TagTypes.END) {
        return;
    }
    return {
        type: NodeTypes.ELEMENT,
        tag
    };
}
// 默认解析 Text
function parseText(context) {
    let endIndex = context.source.length;
    const endTokens = ['<', '{{'];
    for (let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i]);
        if (index !== -1 && endIndex > index) {
            endIndex = index;
        }
    }
    const content = parseTextData(context, endIndex);
    console.log('parseText --- context.source', context.source);
    return { type: NodeTypes.TEXT, content };
}
function parseTextData(context, length) {
    const rawText = context.source.slice(0, length);
    advanceBy(context, length);
    return rawText;
}
function startsWithEndTagOpen(source, tag) {
    return (startsWith(source, '</') &&
        source.slice(2, 2 + tag.length).toLocaleLowerCase() ===
            tag.toLocaleLowerCase());
}
function advanceBy(context, length) {
    context.source = context.source.slice(length);
}
function createRoot(children) {
    return {
        type: NodeTypes.ROOT,
        children
    };
}
function createParseContext(content) {
    return {
        source: content
    };
}

function transform(root, options = {}) {
    const context = createTransformContext(root, options);
    // 1. 深度优先遍历
    traverseNode(root, context);
    // root.codegenNode
    createRootCodegen(root);
    root.helpers = [...context.helpers.keys()];
}
function createRootCodegen(root) {
    const child = root.children[0];
    if (child.type === NodeTypes.ELEMENT) {
        root.codegenNode = child.codegenNode;
    }
    else {
        root.codegenNode = child;
    }
}
function createTransformContext(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1);
        }
    };
    return context;
}
function traverseNode(node, context) {
    const exitFns = [];
    const { nodeTransforms } = context || {};
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transformFunc = nodeTransforms[i];
        const onExit = transformFunc(node, context);
        if (onExit) {
            exitFns.push(onExit);
        }
    }
    // console.log('node', node)
    switch (node.type) {
        case NodeTypes.INTERPOLATION:
            context.helper(TO_DISPLAY_STRING);
            break;
        case NodeTypes.ROOT:
        case NodeTypes.ELEMENT:
            traverseChildren(node.children, context);
            break;
    }
    let i = exitFns.length;
    // i-- 这个很巧妙
    // 使用 while 是要比 for 快 (可以使用 https://jsbench.me/ 来测试一下)
    while (i--) {
        exitFns[i]();
    }
}
function traverseChildren(children, context) {
    if (children) {
        for (let j = 0; j < children.length; j++) {
            const childNode = children[j];
            traverseNode(childNode, context);
        }
    }
}

function transformElement(node, context) {
    if (node.type === NodeTypes.ELEMENT) {
        return () => {
            // TODO
            // 需要把之前的 props 和 children 等一系列的数据都处理
            const vnodeTag = `'${node.tag}'`;
            // TODO props 暂时不支持
            const vnodeProps = null;
            let vnodeChildren = null;
            if (node.children.length > 0) {
                if (node.children.length === 1) {
                    // 只有一个孩子节点 ，那么当生成 render 函数的时候就不用 [] 包裹
                    const child = node.children[0];
                    vnodeChildren = child;
                }
            }
            // 创建一个新的 node 用于 codegen 的时候使用
            node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }
}

function transformExpression(node) {
    if (node.type === NodeTypes.INTERPOLATION) {
        node.content = processExpression(node.content);
    }
}
function processExpression(node) {
    node.content = `_ctx.${node.content}`;
    return node;
}

function isText(node) {
    const { type } = node || {};
    return type === NodeTypes.TEXT || type === NodeTypes.INTERPOLATION;
}

function transformText(node) {
    if (node.type === NodeTypes.ELEMENT) {
        return () => {
            const children = node.children;
            const { length } = children || [];
            let currentContainer;
            for (let i = 0; i < length; i++) {
                const child = children[i];
                // 看看下一个节点是不是 text 类
                if (isText(child)) {
                    for (let j = i + 1; j < length; j++) {
                        const nextChild = children[j];
                        if (isText(nextChild)) {
                            if (!currentContainer) {
                                currentContainer = children[i] = {
                                    type: NodeTypes.COMPOUND_EXPRESSION,
                                    children: [child]
                                };
                            }
                            currentContainer.children.push(' + ', nextChild);
                            children.splice(j, 1);
                            j--;
                        }
                        else {
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

function baseCompile(template) {
    // 1. 先把 template 也就是字符串 parse 成 ast
    const ast = baseParse(template);
    // 2. 转化 ast
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText]
    });
    // 3. 生成 render 函数代码
    return generate(ast);
}

// mini-vue 出口
function complier2Function(template) {
    const { code } = baseCompile(template);
    const render = new Function('Vue', code)(runtimeDom);
    return render;
}
registerRuntimeCompiler(complier2Function);

exports.createApp = createApp;
exports.createElementVNode = createVNode;
exports.createRenderer = createRenderer;
exports.createTextVNode = createTextVNode;
exports.effect = effect;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.nextTick = nextTick;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.ref = ref;
exports.registerRuntimeCompiler = registerRuntimeCompiler;
exports.renderSlots = renderSlots;
exports.shallowReadonly = shallowReadonly;
exports.toDisplayString = toDisplayString;
