export default function BoxIcon(props: { size: number; color: string }) {
  const color = props.color;

  return (
    <svg
      version='1.0'
      xmlns='http://www.w3.org/2000/svg'
      width={props.size}
      height={props.size}
      viewBox='0 0 1278.000000 1280.000000'
      preserveAspectRatio='xMidYMid meet'
    >
      <g
        transform='translate(0.000000,1280.000000) scale(0.100000,-0.100000)'
        fill={color}
        stroke='none'
      >
        <path
          d='M1535 12720 c-372 -7 -468 -19 -660 -81 -367 -118 -619 -382 -730
-767 -35 -120 -53 -236 -65 -417 -14 -218 -14 -9972 0 -10180 51 -765 429
-1143 1195 -1194 218 -15 10004 -15 10230 -1 253 16 453 64 617 146 99 50 148
85 236 168 211 201 315 469 342 881 14 222 14 9970 0 10190 -28 421 -128 690
-339 908 -181 188 -410 289 -762 338 -63 9 -1277 12 -4904 14 -2651 1 -4973
-1 -5160 -5z'
        />
      </g>
    </svg>
  );
}
