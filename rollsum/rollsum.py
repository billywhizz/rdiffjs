import datetime

def fasterRollsum(data):
	A = 0
	B = 0
	for b in data:
		A += b + 31
		B += A
	return (A & 0xffff) | ((B & 0xffff) * 65536)

fd = open('./small.pdf', "rb")
b1 = fd.read(2048)
b2 = fd.read(2048)
b3 = fd.read(2048)
b4 = fd.read(2048)

runs = 100000
a = datetime.datetime.now()
while (runs > 0):
	fasterRollsum(b1)
	fasterRollsum(b2)
	fasterRollsum(b3)
	fasterRollsum(b4)
	runs -= 1
b = datetime.datetime.now()
c = b - a
print(c)