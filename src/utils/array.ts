/** Move an element in an array from one index to another (in place) */
export function arraymove(arr: any[], fromIndex: number, toIndex: number): void {
    const element = arr[fromIndex];
    arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, element);
}
