import { Subscribable } from './subscribable';
declare class FocusManager extends Subscribable {
    private focused?;
    private removeEventListener?;
    protected onSubscribe(): void;
    setEventListener(setup: (setFocused: (focused?: boolean) => void) => () => void): void;
    setFocused(focused?: boolean): void;
    onFocus(): void;
    isFocused(): boolean;
    private setDefaultEventListener;
}
export declare const focusManager: FocusManager;
export {};
