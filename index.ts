export * from "./assembly";

export class React {
  public static Component(): void {}

  public static createElement(
    component: Function,
    props: Map<string, string | typeof React.Component> | null,
    element: string | null | Function = null
  ): void {}

  public static Fragment = () => {};
}
