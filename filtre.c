#include <emscripten/emscripten.h>
#include <emmintrin.h>
#include <stdint.h>

EMSCRIPTEN_KEEPALIVE
void make_grey_tile(uint8_t* buf, int offset, int length) {
    int i = offset;

    const __m128i coefR = _mm_set1_epi16(77);
    const __m128i coefG = _mm_set1_epi16(150);
    const __m128i coefB = _mm_set1_epi16(29);

    for (; i + 16 <= offset + length; i += 16) {
        __m128i px = _mm_loadu_si128((__m128i*)&buf[i]);

        __m128i r = _mm_and_si128(px, _mm_set1_epi32(0x000000FF));
        __m128i g = _mm_and_si128(_mm_srli_epi32(px,8), _mm_set1_epi32(0xFF));
        __m128i b = _mm_and_si128(_mm_srli_epi32(px,16), _mm_set1_epi32(0xFF));

        r = _mm_unpacklo_epi8(r, _mm_setzero_si128());
        g = _mm_unpacklo_epi8(g, _mm_setzero_si128());
        b = _mm_unpacklo_epi8(b, _mm_setzero_si128());

        __m128i grey = _mm_add_epi16(
                        _mm_add_epi16(_mm_mullo_epi16(r, coefR),
                                      _mm_mullo_epi16(g, coefG)),
                        _mm_mullo_epi16(b, coefB));
        grey = _mm_srli_epi16(grey, 8);

        __m128i greyRGB = _mm_or_si128(_mm_or_si128(grey, _mm_slli_epi32(grey,8)),
                                       _mm_slli_epi32(grey,16));

        __m128i alpha = _mm_and_si128(px, _mm_set1_epi32(0xFF000000));
        __m128i out = _mm_or_si128(greyRGB, alpha);

        _mm_storeu_si128((__m128i*)&buf[i], out);
    }

    // reste scalaire
    for (; i < offset + length; i +=4) {
        int g = (buf[i]*77 + buf[i+1]*150 + buf[i+2]*29)>>8;
        buf[i] = buf[i+1] = buf[i+2] = g;
        buf[i+3] = 255;
    }
}
