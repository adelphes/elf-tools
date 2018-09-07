const assert = require('assert');
const elf_tools = require('../index.js');
const fs = require('fs');
const path = require('path');

describe("ELF reader", function () {
    it("parses valid ELF files", function () {
        const binary = fs.readFileSync(path.join(__dirname, 'programs/helloworld/helloworld'));
        assert.doesNotThrow(() => {
            const parsed = elf_tools.parse(binary);
            assert.ok(parsed);
        });
    });


    it("throws on bad ELF signature", function () {
        const binary = Buffer.from('BAD_ELF_SIG');
        assert.throws(() => {
            elf_tools.parse(binary);
        });
    });
});
