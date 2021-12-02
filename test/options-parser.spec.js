const assert = require('assert');
const optionsParser = require('../src/js/utils/options-parser');

describe(`userOptionParser`, function () {
    describe(`parseOptions()`, function () {
        it(`should return an array`, function () {
            assert.equal(optionsParser.parseOptions().length, 0);
            assert.equal(optionsParser.parseOptions("1").length, 1);
            assert.equal(optionsParser.parseOptions("1,2,3").length, 3);
        });
        it(`supports simple options`, function () {
            assert.deepEqual(optionsParser.parseOptions("1,2,3"), ["1", "2", "3"]);
        });
        it(`supports key-value pair options`, function () {
            assert.deepEqual(optionsParser.parseOptions("a:1,b:2,c:3"), [{ key: "a", value: "1" }, { key: "b", value: "2" }, { key: "c", value: "3" }]);
            assert.deepEqual(optionsParser.parseOptions("a with spaces:1,b_with_underscores:2,c:3"), [{ key: "a with spaces", value: "1" }, { key: "b_with_underscores", value: "2" }, { key: "c", value: "3" }]);
        });
        it(`supports multiple operational options`, function () {
            assert.deepEqual(optionsParser.parseOptions("Title{~UAT}Raised by UAT,Organisation{!Panintelligence}:Raised by Customer").length, 2);
        });
        it(`supports operational options with ~`, function () {
            const option = optionsParser.parseOptions("Title{~UAT}:Raised by UAT")[0];
            assert.equal(option.key, "Title");
            assert.equal(option.value, "Raised by UAT");
            assert.equal(option.item, "UAT");
            assert.equal(option.operationType, "~");
            assert.equal(option.operation("Something with UAT in the name"), "Raised by UAT");
            assert.equal(option.operation("Something with something else in the name"), null);
        });
        it(`supports operational options with ~`, function () {
            const option = optionsParser.parseOptions("Title{!~UAT}:Not raised by UAT")[0];
            assert.equal(option.key, "Title");
            assert.equal(option.value, "Not raised by UAT");
            assert.equal(option.item, "UAT");
            assert.equal(option.operationType, "!~");
            assert.equal(option.operation("Something with UAT in the name"), null);
            assert.equal(option.operation("Something with something else in the name"), "Not raised by UAT");
        });
        it(`supports operational options with =`, function () {
            const option = optionsParser.parseOptions("Title{=UAT}:Raised by UAT")[0];
            assert.equal(option.key, "Title");
            assert.equal(option.value, "Raised by UAT");
            assert.equal(option.item, "UAT");
            assert.equal(option.operationType, "=");
            assert.equal(option.operation("Something with UAT in the name"), null);
            assert.equal(option.operation("UAT"), "Raised by UAT");
        });
        it(`supports operational options with !`, function () {
            const option = optionsParser.parseOptions("Title{!=UAT}:Not raised by UAT")[0];
            assert.equal(option.key, "Title");
            assert.equal(option.value, "Not raised by UAT");
            assert.equal(option.item, "UAT");
            assert.equal(option.operationType, "!=");
            assert.equal(option.operation("Something with UAT in the name"), "Not raised by UAT");
            assert.equal(option.operation("UAT"), null);
            assert.equal(option.operation("Hi"), "Not raised by UAT");
        });
    });
});
