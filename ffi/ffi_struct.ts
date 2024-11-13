
type ValueOf<T> = T[keyof T];
export type ValidTypes = Uncapitalize<ValueOf<{[k in keyof DataView]: k extends `get${infer U}`? U : never}>> 

const PTRSIZE = 8; //im pretty sure bun enforces this tbh

export type struct_definition = 
    ({type: struct_definition, field_name :string} | 

    //to be fair, theres no coupling between the number type being read and the size here even though you should
    //
    {type: ValidTypes, size: number, field_name: string} | 
    // {type: "Pointer", size: number, field_name: string} |
    {type: "string", size?: number, field_name: string} |
    {type: "PADDING", size: number} 
) []


// unwraps the intersections 
type Identity<T> = T extends object
    ? {
        [P in keyof T as string extends P ? never : P]: T[P] extends object
          ? Identity<T[P]>
          : T[P];
      }
    : T;



type EndsWith<T extends string, F extends string> = T extends `${string}${F}` ? T : never;
type FieldNames<T extends struct_definition, str extends string[] = [], idx extends number[] = []> = idx['length'] extends T['length'] ? str : 
    T[str['length']] extends {field_name : string} ? FieldNames<T, [...str, T[str["length"]]["field_name"]], [0, ...idx]> : FieldNames<T, [...str, "PADDING"], [0, ...idx]>

//if cnt = fieldcnt, return accumulate, otherwise recurse

//removes keys where A[key] = never
type Override<A, B = A> = Omit<A, keyof B> & {
    [K in keyof B as B[K] extends never ? never : K]: B[K]
}

export type StructReadResult<T extends struct_definition, accumulate = {}, count extends number[] = [], fields extends string[] = FieldNames<T>> = 
count['length'] extends fields["length"] ? Identity<accumulate> :
// accumulate intersection w/ object w/ one more key
    StructReadResult<T, Override<accumulate> & {
        //key = fields[cnt] : fieldtype
        //fieldtype == structdef -> recurse
        //fieldftype == one of the numbertypes -> 64byte = bigint, else numebr
        //fieldtype == "string" -> string field (special treatment)
        //default (fieldtype == padding), we increment cnt hile making fieldtype never lol
        [key in fields[count['length']]] : (T[count['length']]["type"] extends struct_definition ? StructReadResult<T[count['length']]["type"]> : 
            T[count['length']]["type"] extends ValidTypes ? 
                                                    //this condition doesnt work the other way around for some reason???
                (EndsWith<T[count['length']]["type"], "64"> extends never ? number : bigint ) : 
                (T[count['length']]["type"] extends "string" ? string : never)
         )
         //increment counts, pass fields as normal
    }, [1, ...count], fields>



export function get_struct_size(defin: struct_definition){
    let size = 0;
    for(let entry of defin){
        if(typeof entry.type === "string"){
            size += (entry.size ? entry.size : 8);
        }else{
            size += get_struct_size(entry.type)
        }
    }
    return size;
}

import {CString, ptr, toArrayBuffer} from "bun:ffi";
import type {Pointer} from "bun:ffi";



export function ptr_to_data_view(pointer:number, size: number){
    //todo: do i need to copy this? or am i safe to use this buffer
    let dataView = new DataView(toArrayBuffer(pointer as Pointer, 0, size) as ArrayBuffer)
    return dataView
}

/**
 * 
 * @param addr Pointer (address) where the struct starts
 * @param def Struct definition 
 * @returns Struct as JS object
 */
export function read_value<T extends struct_definition>(addr: number|bigint, def: T):{
    result: StructReadResult<T>,
    bytes_read: number
}{
    let total_size = get_struct_size(def);
    // console.log(total_size)
    let address = addr as number;
    if(typeof addr === "bigint") {address = Number(addr)}

    let data_view  = ptr_to_data_view(address, total_size)
    let obj = {} as any;
    let offset = 0;

    for(let field of def){

        if(field.type == "PADDING"){
            offset += field.size
        }else if (field.type == "string"){
            let size = field.size;
            //if size is 0, we assume its just a cstring type situation
            let ptr = data_view.getBigUint64(offset, true);
            let str = size == 0 ? new CString(Number(ptr) as Pointer) : new CString(Number(ptr) as Pointer, 0, size);
            obj[field.field_name] = str;    
            offset += PTRSIZE;
        }
        else if("size" in field){
            let fixed = field.type;
            let capitalized = fixed[0].toUpperCase()+fixed.slice(1) as Capitalize<ValidTypes>;
            let val = data_view[`get${capitalized}`](offset, true)
            obj[field.field_name] = val
            offset += field.size;
        }else{
            //this should work?
            let value = read_value(address + offset, field.type);
            obj[field.field_name] = value.result;
            offset += value.bytes_read
        }
    }
    return {
        result: obj,
        bytes_read: offset
    };
}

/**
 * 
 * @param addr the dataview to write to
 * @param def the type definition
 * @param obj the object
 * @returns Buffer[] : array of newly allocated memory to write each data field to
 */
export function write_value<T extends StructReadResult<U>,U extends struct_definition>(addr:DataView, def:U, obj: T){
    // todo: test any of this... i just wrote it hoping it will work btw
    let total_size = get_struct_size(def);
    let offset = 0;

    if(addr.byteLength < total_size){
        throw new Error("not enough space to write type!");
    }
    
    let allocatedBufs :Buffer[]= [];
    for(let field of def){
        
        if(field.type == "PADDING"){
            offset += field.size;
        }else if(field.type == "string"){
            let field_data = obj[field.field_name as keyof T] as string;
            let buf = Buffer.alloc(field.size || field_data.length + 1);
            buf.write(field_data);
            let buf_ptr = ptr(buf);
            //write ptr to dataview
            addr.setBigUint64(offset, BigInt(buf_ptr), true);
            offset += PTRSIZE

            //add str to allocatedBufs
            allocatedBufs.push(buf);
        }else if("size" in field){
            let field_data = obj[field.field_name as keyof T] as number | bigint; //numebr or bigint
            let fixed = field.type;
            let capitalized = (fixed[0].toUpperCase() + fixed.slice(1)) as Capitalize<ValidTypes>;


            let method = addr[`set${capitalized}`];
            //@ts-ignore 
            //the setmethods have a union mismatch of number and bigint 
            method(0,field_data, true);
            let size = Number(capitalized.slice(capitalized.length-2))/8;
            offset += size; //todo: may need to deal with alignment here?

        }else{
            let field_data = obj[field.field_name as keyof T] as object;
            let field_def = field.type
            let buf = Buffer.alloc(get_struct_size(field_def));
            let data_view = new DataView(buf.buffer);
            let value = write_value(data_view, field_def, field_data)
            
            let buf_ptr = ptr(buf);
            addr.setBigUint64(offset, BigInt(buf_ptr), true);
            offset += PTRSIZE
            //return allocated bufs
            allocatedBufs.push(buf, ...value);
        }
    }
    return allocatedBufs;    
}

// write_value(0, pcap_pkthdr_def, {
//     timeval: {
//         tv_sec: 0n,
//         tv_usec: 0
//     },
//     caplen: 0,
//     len: 0,
// })

// const test = read_value(0, pcap_pkthdr_def)




