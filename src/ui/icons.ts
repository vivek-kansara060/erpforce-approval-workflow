/**
 * Every MUI icon the package draws, imported once, by path.
 *
 * Why by path: `@mui/icons-material` is externalised, so a barrel import would
 * survive into the CommonJS build as `require("@mui/icons-material")` and load
 * all ~2,000 icons for the two dozen used here.
 *
 * Why through `icon()`: each per-icon file is CommonJS (`exports.default`).
 * This package is `"type": "module"`, and a module in such a package that
 * default-imports CommonJS gets Node's interop — `module.exports`, not
 * `module.exports.default`. esbuild applies that rule, so under Vite's dev
 * optimizer every icon arrived as `{ default: Icon }` and React refused to
 * render it. Bundlers that honour `__esModule` hand over the component itself.
 * `icon()` accepts either shape, so the result is correct under every
 * toolchain. `scripts/validate-package.mjs` bundles this module the way Vite
 * does and fails the build if any export is not a renderable component.
 *
 * Components import icons from here only; ESLint enforces it.
 */

import type { SvgIconComponent } from '@mui/icons-material';
import AccountTreeOutlinedModule from '@mui/icons-material/AccountTreeOutlined';
import AddModule from '@mui/icons-material/Add';
import ArrowBackModule from '@mui/icons-material/ArrowBack';
import ArrowUpwardModule from '@mui/icons-material/ArrowUpward';
import BackspaceOutlinedModule from '@mui/icons-material/BackspaceOutlined';
import BlockModule from '@mui/icons-material/Block';
import CenterFocusStrongModule from '@mui/icons-material/CenterFocusStrong';
import CheckModule from '@mui/icons-material/Check';
import CheckCircleOutlineModule from '@mui/icons-material/CheckCircleOutline';
import CloseModule from '@mui/icons-material/Close';
import ErrorOutlineModule from '@mui/icons-material/ErrorOutline';
import ExpandMoreModule from '@mui/icons-material/ExpandMore';
import FilterAltOutlinedModule from '@mui/icons-material/FilterAltOutlined';
import HighlightOffModule from '@mui/icons-material/HighlightOff';
import HistoryOutlinedModule from '@mui/icons-material/HistoryOutlined';
import HourglassEmptyOutlinedModule from '@mui/icons-material/HourglassEmptyOutlined';
import InboxOutlinedModule from '@mui/icons-material/InboxOutlined';
import InfoOutlinedModule from '@mui/icons-material/InfoOutlined';
import KeyboardArrowDownModule from '@mui/icons-material/KeyboardArrowDown';
import LockOutlinedModule from '@mui/icons-material/LockOutlined';
import OpenInNewModule from '@mui/icons-material/OpenInNew';
import PersonOutlineOutlinedModule from '@mui/icons-material/PersonOutlineOutlined';
import RemoveModule from '@mui/icons-material/Remove';
import SearchModule from '@mui/icons-material/Search';
import SendOutlinedModule from '@mui/icons-material/SendOutlined';

/** The component, whether the bundler handed over it or its `module.exports`. */
export const icon = (imported: SvgIconComponent): SvgIconComponent =>
  (imported as unknown as { default?: SvgIconComponent }).default ?? imported;

export const AccountTreeOutlinedIcon = /* @__PURE__ */ icon(AccountTreeOutlinedModule);
export const AddIcon = /* @__PURE__ */ icon(AddModule);
export const ArrowBackIcon = /* @__PURE__ */ icon(ArrowBackModule);
export const ArrowUpwardIcon = /* @__PURE__ */ icon(ArrowUpwardModule);
export const BackspaceOutlinedIcon = /* @__PURE__ */ icon(BackspaceOutlinedModule);
export const BlockIcon = /* @__PURE__ */ icon(BlockModule);
export const CenterFocusStrongIcon = /* @__PURE__ */ icon(CenterFocusStrongModule);
export const CheckIcon = /* @__PURE__ */ icon(CheckModule);
export const CheckCircleOutlineIcon = /* @__PURE__ */ icon(CheckCircleOutlineModule);
export const CloseIcon = /* @__PURE__ */ icon(CloseModule);
export const ErrorOutlineIcon = /* @__PURE__ */ icon(ErrorOutlineModule);
export const ExpandMoreIcon = /* @__PURE__ */ icon(ExpandMoreModule);
export const FilterAltOutlinedIcon = /* @__PURE__ */ icon(FilterAltOutlinedModule);
export const HighlightOffIcon = /* @__PURE__ */ icon(HighlightOffModule);
export const HistoryOutlinedIcon = /* @__PURE__ */ icon(HistoryOutlinedModule);
export const HourglassEmptyOutlinedIcon = /* @__PURE__ */ icon(HourglassEmptyOutlinedModule);
export const InboxOutlinedIcon = /* @__PURE__ */ icon(InboxOutlinedModule);
export const InfoOutlinedIcon = /* @__PURE__ */ icon(InfoOutlinedModule);
export const KeyboardArrowDownIcon = /* @__PURE__ */ icon(KeyboardArrowDownModule);
export const LockOutlinedIcon = /* @__PURE__ */ icon(LockOutlinedModule);
export const OpenInNewIcon = /* @__PURE__ */ icon(OpenInNewModule);
export const PersonOutlineOutlinedIcon = /* @__PURE__ */ icon(PersonOutlineOutlinedModule);
export const RemoveIcon = /* @__PURE__ */ icon(RemoveModule);
export const SearchIcon = /* @__PURE__ */ icon(SearchModule);
export const SendOutlinedIcon = /* @__PURE__ */ icon(SendOutlinedModule);
