// Wrangler 的 [[rules]] type = "Text" 让 .html / .css / .client.js 作为字符串导入。
// 这里给 TypeScript 一份 ambient 声明，避免编译报"找不到模块"。

declare module '*.html' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.client.js' {
  const content: string;
  export default content;
}
