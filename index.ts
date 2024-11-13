let buf = Buffer.alloc(10);
for(let i = 0; i < 10; i++) buf[i] = i

let dv = new DataView(buf.buffer);
console.log(buf)

dv.setUint32(0, 0)
console.log(buf)
