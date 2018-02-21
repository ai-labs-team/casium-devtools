const { configure } = require('enzyme');
const Adapter = require('enzyme-adapter-react-15');
const tsNode = require('ts-node');
const ignoreStyles = require('ignore-styles').default;

ignoreStyles(['.scss']);

tsNode.register({
	compilerOptions: {
		module: 'commonjs'
	}
});

configure({ adapter: new Adapter() });
