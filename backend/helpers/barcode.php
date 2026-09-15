<?php
// Netra Unnayan - Pure PHP Code 128 Barcode Generator (SVG)

class Barcode128 {
    // Code 128 B Character Table (Width of bars and spaces)
    private static array $patterns = [
        ' ' => '212222', '!' => '222122', '"' => '222221', '#' => '121223',
        '$' => '121322', '%' => '131222', '&' => '122213', '\''=> '122312',
        '(' => '132212', ')' => '221213', '*' => '221312', '+' => '231212',
        ',' => '112232', '-' => '122132', '.' => '122231', '/' => '113222',
        '0' => '123122', '1' => '123221', '2' => '223211', '3' => '221132',
        '4' => '221231', '5' => '213212', '6' => '223112', '7' => '312131',
        '8' => '311222', '9' => '321122', ':' => '321221', ';' => '312212',
        '<' => '322112', '=' => '322211', '>' => '212123', '?' => '212321',
        '@' => '232121', 'A' => '111323', 'B' => '131123', 'C' => '131321',
        'D' => '112313', 'E' => '132113', 'F' => '132311', 'G' => '211313',
        'H' => '231113', 'I' => '231311', 'J' => '112133', 'K' => '112331',
        'L' => '132131', 'M' => '113123', 'N' => '113321', 'O' => '133121',
        'P' => '313121', 'Q' => '211331', 'R' => '231131', 'S' => '213113',
        'T' => '213311', 'U' => '213131', 'V' => '311123', 'W' => '311321',
        'X' => '331121', 'Y' => '312113', 'Z' => '312311', '[' => '332111',
        '\\' => '314111', ']' => '221411', '^' => '431111', '_' => '111224',
        '`' => '111422', 'a' => '121124', 'b' => '121421', 'c' => '141122',
        'd' => '141221', 'e' => '112214', 'f' => '112412', 'g' => '122114',
        'h' => '122411', 'i' => '142112', 'j' => '142211', 'k' => '241211',
        'l' => '221114', 'm' => '413111', 'n' => '241112', 'o' => '134111',
        'p' => '111242', 'q' => '121142', 'r' => '121241', 's' => '114212',
        't' => '124112', 'u' => '124211', 'v' => '411212', 'w' => '421112',
        'x' => '421211', 'y' => '212141', 'z' => '214121', '{' => '412121',
        '|' => '111143', '}' => '111341', '~' => '131141'
    ];

    private static string $startB = '211214'; // Start Code B (val 104)
    private static string $stop   = '2331112'; // Stop code

    public static function getSvg(string $code, int $height = 50, float $moduleWidth = 1.8): string {
        $code = trim($code);
        $encoded = self::$startB;
        $checksum = 104; // Start B value

        $chars = str_split($code);
        $i = 1;
        foreach ($chars as $ch) {
            $val = ord($ch) - 32;
            if ($val < 0 || $val > 94) {
                $val = 0;
            }
            $checksum += ($val * $i);
            $i++;
            $pattern = self::$patterns[$ch] ?? self::$patterns[' '];
            $encoded .= $pattern;
        }

        $checkVal = $checksum % 103;
        // Find pattern for check value
        $charList = array_keys(self::$patterns);
        $checkChar = $charList[$checkVal] ?? ' ';
        $encoded .= (self::$patterns[$checkChar] ?? '212222');
        $encoded .= self::$stop;

        // Render SVG bars
        $x = 10;
        $rects = '';
        $isBar = true;
        for ($k = 0; $k < strlen($encoded); $k++) {
            $w = (int)$encoded[$k] * $moduleWidth;
            if ($isBar) {
                $rects .= sprintf('<rect x="%.2f" y="0" width="%.2f" height="%d" fill="#0A192F" />', $x, $w, $height);
            }
            $x += $w;
            $isBar = !$isBar;
        }

        $totalWidth = $x + 10;
        $textY = $height + 14;
        $svgHeight = $height + 18;

        return sprintf(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %.2f %d" width="%.2f" height="%d" style="background:#ffffff;display:inline-block;">' .
            '%s' .
            '<text x="%.2f" y="%d" font-family="Courier, monospace" font-size="12" font-weight="bold" fill="#0A192F" text-anchor="middle" letter-spacing="2">%s</text>' .
            '</svg>',
            $totalWidth, $svgHeight, $totalWidth, $svgHeight,
            $rects,
            $totalWidth / 2, $textY, htmlspecialchars($code)
        );
    }
}
