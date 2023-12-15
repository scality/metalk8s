import { CoreUITheme } from '@scality/core-ui/dist/style/theme';
import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme extends CoreUITheme {}
}
