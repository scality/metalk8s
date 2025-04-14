import 'styled-components';
import { CoreUITheme } from '../src/lib/style/theme';

declare module 'styled-components' {
  export interface DefaultTheme extends CoreUITheme {}
}
