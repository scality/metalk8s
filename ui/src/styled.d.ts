import 'styled-components';
import { CoreUITheme } from '@scality/core-ui/dist/style/theme';
declare module 'styled-components' {
  export interface DefaultTheme extends CoreUITheme {}
}
