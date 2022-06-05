import { prismPlugin } from "@milkdown/plugin-prism";
import jsx from "refractor/lang/jsx";
import tsx from 'refractor/lang/tsx';

export default prismPlugin({
  configureRefractor: (refractor) => {
    refractor.register(jsx);
    refractor.register(tsx);
  },
});
