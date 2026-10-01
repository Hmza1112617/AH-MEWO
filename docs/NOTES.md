# Client notes

Target: `8BP-SharkAIM(56.30.1) V3`

## Layout

| file | role |
|---|---|
| `lib/arm64-v8a/library.so` | the overlay client (5,667,504 B) |
| `lib/arm64-v8a/libgdtflex.so` | encrypted blob, 309,296 B |
| `lib/arm64-v8a/libgdtqjs.so` | Tencent Legu artifact, 1,133,312 B |
| `lib/arm64-v8a/libloader.so` | Tencent Legu loader, 6,329,128 B |
| `lib/arm64-v8a/libprotect.so` | Tencent Legu, 1,127,608 B |
| `lib/arm64-v8a/libpglarmor.so` | Tencent Legu, 68,600 B |

`library.so` is a stripped AArch64 ELF, NDK r24 / clang 14, with OpenSSL
and libcurl linked in statically.

The Legu files are byte identical across mod versions, so they are not
part of the mod itself.

## Protection

There is **no local protection**. A scan of the whole 3.1 MB `.text` for
the `0xDEADBEEFCAFEBABE` integrity constant used by other builds of this
family returns zero hits. No signature check, no self-hash.

Protection is only:

1. a license server that approves or rejects the key
2. `com.unknownmodz.update.UpdateChecker` in `classes3.dex`, called from
   `EightBallPoolActivity.onCreate`, which shows a forced update dialog

## Auth call path

```
0x1AFFB8  add  x0, x0, #0x680      ; 0x59D680 = endpoint URL
0x1AFFC8  bl   0x1AF96C           ; build request
0x1AF99C  bl   0x2CDAA0           ; libcurl call (POST + JSON body)
0x1AFAFC  add  x21, x21, #0x22A    ; 0xEC22A = '"'  -> JSON body assembly
```

The JSON body is assembled inline; `0xEC22A` is a bare double quote
used as the field delimiter.

## Globals

| address | content |
|---|---|
| `0x59D680` | `std::string` endpoint URL, default `https://enginehost.org/connect` |
| `0x59D6F0` | `std::string` expiry, default `N/A` (static init at `0x254520`) |
| `0x59D6C0`, `0x59D6D8` | two more `std::string` globals, empty at rest |

## JNI surface

```
Java_android_service_SurfaceView_onSendConfig
Java_android_service_SurfaceView_onCanvasDraw
Java_android_service_SurfaceView_MenuColor
Java_android_service_SurfaceView_getExpTime
Java_com_qiyi_xhook_NativeHandler_enableSigSegvProtection
```

`getExpTime` (`0x2179A4`) returns the field at `[x10 + 1336]`, or the
string `N/A` (`0xEB4B2`) when `0x59D6F0` is empty. So the expiry comes
from the server response.

## String obfuscation

Most of `.rodata` is scrambled. Strings are decoded inline at each use
site by a byte mixer of the form:

```
add   w11, w8, w11
add   w12, w11, w10
and   w10, w11, w10
sub   w10, w12, w10, lsl #1
add   w10, w10, #imm
strb  w10, [x19, x8]
```

The constants are baked per call site, so a plain string dump of the file
is not enough. Plain survivors include the three URLs, `"status": true`
(`0xE8858`) and the JNI descriptors.

## ELF anchors

```
.text   0x1A0C70  size 0x2F9E28
.rodata 0x0E5B10  size 0x881D4
.data   0x4D7090  size 0x92110
.bss    0x56A000  size 0x4D338
```

PLT entries used for a runtime patch:

```
exit    0x49AC00      _exit   0x49AC30      kill    0x49BE20
connect 0x49BCA0      abort   0x49E900      sleep   0x49AC20
```

## Reference patch

A working third party build of the same release differs from the stock
one in exactly two places:

1. `library.so` at `0xEC5F4`, 22 bytes: the endpoint string
2. `classes3.dex`: the `invoke-static ... UpdateChecker;->Start` removed
   from `EightBallPoolActivity.onCreate`

Nothing in `.text` is touched. That is the whole "crack".

## Offset table

`0x55B000` in `.data` holds 32 high entropy slots that are rewritten at
runtime. They are the game memory offsets the overlay needs. They are
part of the server delivered payload, so a client that never reaches the
license endpoint has no offsets and no working features.
