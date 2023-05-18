# my-mini-vue

## Learn mini-vue Source Code

[record](./INDEX.md)

## 引入 monorepo

### pnpm 安装全局公用的包

```shell
pnpm i xxx -w
```

> 注意这里使用 -w 表示把包安装在 root 下，该包会放置在 根目录/node_modules 下。当然也可以把把安装在所有 packages 中，使用 -r 代替 -w。你必须使用其中一个参数。例如把 moment 装入 packages/shared 下，packages/shared 中的 package.json name 为 @mashy-mini-vue/shared。需要执行：

```shell
# 使用 --filter 后面接子 package 的 name 表示只把安装的新包装入这个 package 中。
pnpm i moment -r --filter @mashy-mini-vue/shared
```
