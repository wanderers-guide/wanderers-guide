export default function ShieldIcon(props: { size: number; color: string }) {
  const color = props.color;

  return (
    <svg
      version='1.0'
      xmlns='http://www.w3.org/2000/svg'
      width={props.size}
      height={props.size}
      viewBox='0 0 1027.000000 1280.000000'
      preserveAspectRatio='xMidYMid meet'
    >
      <g
        transform='translate(0.000000,1280.000000) scale(0.100000,-0.100000)'
        fill={color}
        stroke='none'
      >
        <path
          d='M4960 12679 c-1533 -1065 -2990 -1969 -3920 -2434 -449 -225 -728
-332 -1013 -390 -28 -6 -28 -6 -23 -68 4 -34 15 -165 26 -292 174 -1986 492
-3791 855 -4855 156 -458 305 -764 501 -1027 527 -711 1376 -1608 2284 -2414
437 -388 932 -796 1349 -1112 l114 -86 31 21 c67 47 511 395 686 538 877 717
1737 1532 2370 2245 391 440 705 842 830 1059 233 406 456 1065 644 1901 234
1045 433 2420 556 3839 22 254 22 255 -25 256 -73 0 -372 100 -610 202 -855
367 -2540 1391 -4299 2613 -89 61 -166 114 -172 118 -6 3 -89 -48 -184 -114z'
        />
      </g>
    </svg>
  );
}
