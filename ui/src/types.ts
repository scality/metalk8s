export type Result<T> =
  | {
      error: any;
    }
  | T;
export type APIResult<T> = Result<{
  body: T;
}>;