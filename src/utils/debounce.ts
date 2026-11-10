export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => unknown,
  delay: number = 300
): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
