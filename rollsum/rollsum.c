#include <stdio.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <stdint.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdlib.h>
#include <sys/time.h>
#include <assert.h>

float millidiff(struct timeval t0, struct timeval t1) {
	return (t1.tv_sec - t0.tv_sec) * 1000.0f + (t1.tv_usec - t0.tv_usec) / 1000.0f;
}

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

int main() {
	int fd = open("./small.pdf", O_RDONLY);
	uint8_t* b1 = malloc(2048);
	uint8_t* b2 = malloc(2048);
	uint8_t* b3 = malloc(2048);
	uint8_t* b4 = malloc(1801);
	read(fd, b1, 2048);
	read(fd, b2, 2048);
	read(fd, b3, 2048);
	read(fd, b4, 1801);
	int runs = 100000;
	struct timeval stop, start;
	gettimeofday(&start, NULL);
	while(runs--) {
		assert(rollsum(b1, 2048) == 4025106459);
		assert(rollsum(b2, 2048) == 307646824);
		assert(rollsum(b3, 2048) == 977512073);
		assert(rollsum(b4, 1801) == 3918749721);
	}
	gettimeofday(&stop, NULL);
	printf("%f\n", millidiff(start, stop));
}