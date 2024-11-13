import type { struct_definition } from "../ffi_struct";

let pcap_if_t = [
    {
        type: "bigUint64",
        size: 8,
        field_name: "next"
    }, {
        type: "string",
        field_name: "name"
    }, {
        type: "string",
        // size: 8,
        field_name: "description"
    }, {
        type: "bigUint64",
        size: 8,
        field_name: "addresses"
    }, {
        type: "int32",
        size: 8,
        field_name: "flags"
    }
] as const satisfies struct_definition

//pcap_pkthdr_t
let pcap_pkthdr_def = [
    {
        field_name: "timeval",
        type: [
            {
                field_name: "tv_sec",
                type: "bigInt64",
                size: 8
            },
            {
                field_name: "tv_usec",
                type: "int32",
                size: 4
            },
            {
                type: "PADDING",
                size: 4 //(8 + 4) from timeval + 4 = 16
            }
        ]
    },
    {
        type: "uint32",
        size: 4,
        field_name: "caplen"
    },
    {
        type: "uint32",
        size: 4,
        field_name: "len"
    },

    // {
    //     //not really but here for testing
    //     type: "string",
    //     // size: 12
    //     field_name:"teststr"
    // }
] as const satisfies struct_definition

export {
    pcap_if_t, pcap_pkthdr_def
}