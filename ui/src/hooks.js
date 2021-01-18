//@flow
import { useSelector } from 'react-redux';
import type { RootState } from './ducks/reducer';

/**
 * It brings automatic strong typing to native useSelector by anotating state with RootState.
 * It should be used instead of useSelector to benefit from RootState typing
 */
export const useTypedSelector: <TSelected>(
  selector: (state: RootState) => TSelected,
  equalityFn?: (left: TSelected, right: TSelected) => boolean,
) => TSelected = useSelector;
