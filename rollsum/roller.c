#include <stdio.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <stdint.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdlib.h>
#include <assert.h>
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
uint32_t rollsum(uint8_t* b, uint32_t len) {
	uint32_t A = 0;
	uint32_t B = 0;
	while(len--) {
		A += *b + 31;
		B += A;
		b++;
	}
	return (A & 0xffff) + ((B & 0xffff) * 65536);
}
