const assert = require('assert');
const elf_tools = require('../index.js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const childproc = require('child_process');

function make_byte_buffer(str) {
    // strip any whitespace and comments
    const hex = str.replace(/(\s+)|(#.*)/g,'');
    return Buffer.from(hex, 'hex');
}

describe("ELF writer", function () {

    it("builds with code Buffer parameter", function () {
        const code = make_byte_buffer(`
            48 31 ff                # xor    rdi,rdi
            48 c7 c0 3c 00 00 00    # mov    rax,0x3c
            0f 05                   # syscall
        `);
        const elf_image = elf_tools.build(code);
        const expected = make_byte_buffer(`7f454c4602010100000000000000000002003e0001000000b0004000000000004000000000000000d800000000000000000000004000380002004000040003000
            100000005000000000000000000000000004000000000000000400000000000bc00000000000000bc0000000000000000001000000000000100000006000000bc00000000000000bc00400000000000bc004
            000000000000000000000000000000000000000000008000000000000004831ff48c7c03c0000000f05002e74657874002e64617461002e73687374727461620000000000000000000000000000000000000
            000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000010000000600000000000000b000400000000000b000000000000
            0000c0000000000000000000000000000000100000000000000000000000000000007000000010000000300000000000000bc00400000000000bc00000000000000000000000000000000000000000000000
            10000000000000000000000000000000d0000000300000000000000000000000000000000000000bc000000000000001700000000000000000000000000000001000000000000000000000000000000`);
        assert.ok(elf_image.equals(expected));
    });

    it("streams to a writable file", function () {
        const code = make_byte_buffer(`
            48 31 ff                # xor    rdi,rdi
            48 c7 c0 3c 00 00 00    # mov    rax,0x3c
            0f 05                   # syscall
        `);
        const elf_stream = elf_tools.createBuildStream(code);
        const tmpfile = path.join(os.tmpdir(), `elftest-${process.hrtime()[1]}` );
        const file_stream = fs.createWriteStream(tmpfile, {mode: 0o755});
        return new Promise((res, rej) => {
            file_stream.on('error', rej);
            file_stream.on('close', () => {
                fs.unlinkSync(tmpfile);
                res();
            })
            elf_stream.pipe(file_stream);
        });
    });

    it("builds an executable that will run", function () {
        if (process.arch !== 'x64') {
            this.skip();
            return;
        }
        const code = make_byte_buffer(`
            48 31 ff                # xor    rdi,rdi
            48 c7 c0 3c 00 00 00    # mov    rax,0x3c
            0f 05                   # syscall
        `);
        const elf_image = elf_tools.build(code);
        const tmpfile = path.join(os.tmpdir(), `elftest-${process.hrtime()[1]}` );
        fs.writeFileSync(tmpfile, elf_image, {mode: 0o755});
        try {
            const result = childproc.execFileSync(tmpfile);
            assert.ok(result);
        } finally {
            fs.unlinkSync(tmpfile);
        }
    });

    it("builds with object parameter with single code Buffer field", function () {
        const code = make_byte_buffer(`
            48 31 ff                # xor    rdi,rdi
            48 c7 c0 3c 00 00 00    # mov    rax,0x3c
            0f 05                   # syscall
        `);
        elf_tools.build({
            code,
        });
    });

    it("allows a custom image load address", function () {
        const code = make_byte_buffer(`
            48 31 ff                # xor    rdi,rdi
            48 c7 c0 3c 00 00 00    # mov    rax,0x3c
            0f 05                   # syscall
        `);
        const base_address = 0x12340000;
        const elf_image = elf_tools.build({
            code,
            base_address,
        });
        const entry_point = elf_image.readUInt32LE(0x18);
        assert.strictEqual(entry_point & 0xffff0000, 0x12340000);
    });

    it("allows a custom entry point offset", function () {
        const code = make_byte_buffer(`
            90                      # nop
            48 31 ff                # xor    rdi,rdi
            48 c7 c0 3c 00 00 00    # mov    rax,0x3c
            0f 05                   # syscall
        `);
        const base_address = 0x12340000;
        const entry_offset = 1; // skip the nop
        const elf_image = elf_tools.build({
            code,
            base_address,
            entry_offset,
        });
        const entry_point = elf_image.readUInt32LE(0x18);
        assert.strictEqual(entry_point, base_address + 0xb0 + entry_offset);
    });

    it("allows custom ELF header values", function () {
        const code = make_byte_buffer(`
            48 31 ff                # xor    rdi,rdi
            48 c7 c0 3c 00 00 00    # mov    rax,0x3c
            0f 05                   # syscall
        `);
        const elf_header = {
            class: '32',
            endian: 'msb',
            osabi: 'arm',
            abiversion: 'none',
            type: 'exec',
            machine: 'arm',
        }
        elf_tools.build({
            code,
            elf_header,
        });
    });

    it("throws on missing parameter", function () {
        assert.throws(() => elf_tools.build());
    });

    it("throws on invalid parameter", function () {
        assert.throws(() => elf_tools.build(''));
        assert.throws(() => elf_tools.build(3));
        assert.throws(() => elf_tools.build(true));
        assert.throws(() => elf_tools.build(null));
    });

    it("throws on missing code field", function () {
        assert.throws(() => {
            elf_tools.build({});
        });
    });

    it("throws on zero-length code", function () {
        const code = Buffer.allocUnsafe(0);
        assert.throws(() => elf_tools.build(code));
        assert.throws(() => elf_tools.build({
            code
        }));
    });

    it("throws when base_address/entry_offset and elf_header.entry are defined", function () {
        const code = Buffer.allocUnsafe(1);
        assert.throws(() => elf_tools.build({
            code,
            base_address: 0x100000,
            elf_header: {
                entry: 0x200000,
            }
        }));
        assert.throws(() => elf_tools.build({
            code,
            entry_offset: 1,
            elf_header: {
                entry: 0x200000,
            }
        }));
    });
});
