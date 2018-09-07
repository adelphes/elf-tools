.intel_syntax noprefix

# simple program to write "Hello world!"

# GNU assemble and link:
# as --64 -o ./helloworld.o ./helloworld.s && ld -s -o helloworld ./helloworld.o
# run:
# ./helloword

.globl _start

.text
_start:
  lea rsi, [rip + hi]   # text address
  mov rdx, 13   # text length
  mov rdi, 1	# fd=stdout
  mov rax, 1	# syscall=write
  syscall
  xor rdi, rdi  
  mov rax, 60	# sys_exit
  syscall
hi:
.ascii "Hello world!\n"
