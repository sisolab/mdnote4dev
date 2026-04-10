/** 사용자 홈 경로를 ~ 로 축약 */
export function shortenPath(path: string): string {
  const m = path.match(/^([A-Z]:\\Users\\[^\\]+)/i);
  return m ? path.replace(m[1], "~") : path;
}

/** 파일 경로에서 파일명 추출 */
export function getFileName(path: string): string {
  return path.split("\\").pop() ?? "";
}

/** 파일 경로에서 디렉토리 경로 추출 */
export function getDirPath(path: string): string {
  return path.substring(0, path.lastIndexOf("\\"));
}
