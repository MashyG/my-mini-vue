import { effect } from "../effect";
import { reactive } from "../reactive";

describe("effect", () => {
  it("happy path", () => {
    const user = reactive({ age: 18 });

    let nextAge;
    effect(() => {
      nextAge = user.age + 1;
    });

    expect(nextAge).toBe(19);

    // 更新
    user.age++;
    expect(nextAge).toBe(20);
  });

  // ？？？
  it("should return runner when call effect", () => {
    // effect (fn) -> return runner 函数 -> 执行函数 runner 后 再次执行 fn 并返回值
    let num = 18;
    const runner = effect(() => {
      num++;
      return "num";
    });
    expect(num).toBe(19);

    const res = runner();
    expect(num).toBe(20);
    expect(res).toBe("num");
  });
});
