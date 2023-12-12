export default function CircleIcon(props: { size: number; color: string }) {
  const color = props.color;

  return (
    <svg
      version='1.0'
      xmlns='http://www.w3.org/2000/svg'
      width={props.size}
      height={props.size}
      viewBox='0 0 1280.000000 1280.000000'
      preserveAspectRatio='xMidYMid meet'
    >
      <g
        transform='translate(0.000000,1280.000000) scale(0.100000,-0.100000)'
        fill={color}
        stroke='none'
      >
        <path
          d='M6095 12794 c-27 -2 -115 -8 -195 -14 -1261 -93 -2504 -584 -3500
-1384 -454 -365 -875 -810 -1215 -1287 -1290 -1808 -1545 -4169 -673 -6221 75
-176 232 -491 328 -658 755 -1314 1927 -2308 3343 -2834 984 -366 2085 -482
3135 -331 2067 299 3866 1597 4803 3465 375 750 579 1475 661 2355 17 182 17
864 0 1035 -68 687 -191 1223 -415 1800 -342 884 -914 1726 -1603 2362 -1068
984 -2323 1547 -3779 1693 -141 15 -773 28 -890 19z'
        />
      </g>
    </svg>
  );
}
