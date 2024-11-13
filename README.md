# mango_bun_ffi
A runtime struct library for bun. 


# How to use it

Define a struct definition as an array of struct fields.

Each struct field can have a few options for the type: another struct definition, Padding, a number/bigint, or a string.

Each struct field is defined as such:
```ts
{
    type: "type", // "PADDING" | number_type | struct_definition | string
    field_name: "field_name" //not required for "type" == "PADDING",
    size: number // size in bytes. If alignment is required, use PADDING fields.
}
```
**Important note: Make sure to define a your struct definition with ``as const satisfies struct_definition`` at the end otherwise typechecking will not work.** 

## Number types

The number types are those supported by the DataView#get and DataView#set functions, but uncapitalized.

# Importing

Install this package with `` bun install https://github.com/TheLostTree/MangoBunFFI.git``
 and import it with ``import {read_value} from "MangoBunFFI"`` 




# Features

## Typechecking

If you pass in a struct definition to the type StructReadResult<T> you will get an object representing the struct.
This is also the result of the read_value() function.

the write_value() function (which i have yet to test unfortunately) will also feature the same typechecking if you pass in the struct definition into the method arguments.



# Usage
See the libpcap_ffi_example script for an example of usage.

Structs are defined in ffi/libpcap/libpcap_${platform}.



# Future things
Possibly will generate the struct definitions via a c++ compilation?


To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.1.33. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
