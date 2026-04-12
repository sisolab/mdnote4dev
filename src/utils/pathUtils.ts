/** 사용자 홈 경로를 ~ 로 축약 */
export function shortenPath(path: string): string {
  const m = path.match(/^([A-Z]:\\Users\\[^\\]+)/i);
  return m ? path.replace(m[1], "~") : path;
}
