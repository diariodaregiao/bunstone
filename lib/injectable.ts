export function Injectable() {
  return function (target: any) {
    Reflect.defineMetadata("injectable", true, target);
  };
}
