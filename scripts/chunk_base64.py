import json
from pprint import pprint

chunked_str = ''

with open("raw_base64.txt", "r") as f:
	i = 0
	read_f = f.read()
	total_len = len(read_f)
	print(total_len)

	for i in range(total_len // 90 + 1):
		end_idx = 90 * (i+1)
		if end_idx > total_len:
			chunked_str += "\"" + read_f[90 * i : total_len + 1] + "\""
		else:
			chunked_str += "\"" + read_f[90 * i : end_idx] + "\" +"

with open("chunked_base64.txt", "w",) as fw:
	fw.write(chunked_str)

			
