.intel_syntax noprefix

# simple program to output a reversed string

# GNU assemble and link:
# as --64 -o ./reverse.o ./reverse.s && ld -s -Ttext 0x4000b0 -Tdata 0x400150 -o reverse ./reverse.o
# run:
# ./a.out

.globl _start

.text
_start:
  # write the prompt
  lea rsi, [rip + prompt]
  mov rdx, 28   # length of prompt
  call _write

  # read the user input
  lea rsi, [rip + buf]  # buffer
  mov rdx, 256  # max size
  call _read
  dec rax       # ignore newline
  mov rdx, rax  # save length

  # copy the string in reverse to the scratch area
  lea rdi, [rip + scratch]
  add rdi, rax
1:
  mov cl, [rsi]
  mov [rdi], cl
  dec rdi
  inc rsi
  sub rax, 1
  jnz 1b    # 1b(efore)

  # write out the reversed string
  mov rsi, rdi
  inc rsi
  mov [rsi+rdx], byte ptr 10    # append a newline to the end
  inc rdx
  call _write

  # exit process with code=0
  xor rdi, rdi  
  mov rax, 60	# sys_exit
  syscall

# int read(fd=rdi, buf=rsi, count=rdx);
_read:
  mov edi, 1	# fd=stdout
  xor rax, rax  # syscall=read
  syscall
  ret

# int write(fd=rdi, buf=rsi, count=rdx);
_write:
  mov rdi, 1	# fd=stdout
  mov rax, 1	# syscall=write
  syscall
  ret

prompt:
.ascii "Enter some text to reverse: "


.data 
# the .data section
.align 8
buf:
.space 256, 0


.bss
# the .bss section
scratch:
.space 256, 0
