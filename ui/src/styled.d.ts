import 'styled-components';
import type {Theme} from './services/api';
declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}
}
