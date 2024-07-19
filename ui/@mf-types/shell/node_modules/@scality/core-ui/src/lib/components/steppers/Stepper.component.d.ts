import { ReactNode } from 'react';
type MAXIMUM_DEPTH = 20;
type GetResults<T> = T extends Step<infer Props> ? Step<Props> : never;
type Length<T extends any[]> = T extends {
  length: infer L;
}
  ? L
  : never;
type BuildTuple<L extends number, T extends any[] = []> = T extends {
  length: L;
}
  ? T
  : BuildTuple<L, [...T, any]>;
export interface Step<T> {
  label: string;
  Component: (args: T) => ReactNode;
}
export type Steps<
  T extends any[],
  Result extends any[] = [],
  Depth extends ReadonlyArray<number> = [],
> = Depth['length'] extends MAXIMUM_DEPTH
  ? Step<unknown>[]
  : T extends []
  ? []
  : T extends [infer Head]
  ? [...Result, GetResults<Head>]
  : T extends [infer Head, ...infer Tail]
  ? Steps<[...Tail], [...Result, GetResults<Head>], [...Depth, 1]>
  : unknown[] extends T
  ? T
  : never;
export type Add<A extends number, B extends number> = Length<
  [...BuildTuple<A>, ...BuildTuple<B>]
>;
export type Subtract<
  A extends number,
  B extends number,
> = BuildTuple<A> extends [...infer U, ...BuildTuple<B>] ? Length<U> : -1;
export type ExctractProps<T> = T extends Step<infer Props> ? Props : never;

declare global {
  export declare type UseStepper = <
    T extends any[],
    StepIndex extends number,
    NextIndex = Add<StepIndex, 1>,
    PrevIndex = Subtract<StepIndex, 1>,
  >(
    index: StepIndex,
    steps: readonly [...Steps<T>],
  ) => (NextIndex extends number
    ? {
        next: (props: ExctractProps<T[NextIndex]>) => void;
      }
    : Record<string, unknown>) &
    (PrevIndex extends -1
      ? Record<string, unknown>
      : PrevIndex extends number
      ? {
          prev: (props: ExctractProps<T[PrevIndex]>) => void;
        }
      : Record<string, unknown>);
  export declare type Stepper = <T extends any[]>({
    steps,
  }: {
    steps: readonly [...Steps<T>];
  }) => JSX.Element;
  export {};
}
//# sourceMappingURL=Stepper.component.d.ts.map
