import { Box, Typography } from '@mui/joy';
import { forwardRef } from 'react';

export interface SpeedLimitProps {
  units: 'metric' | 'imperial';
  speed: number;
  limit: number;
}

// ETS2 Navigasyon: only the speed limit sign is shown. It turns bright red
// when the truck is over the limit.
export const SpeedLimit = forwardRef((props: SpeedLimitProps, ref) => {
  if (props.limit < 5) {
    // no known limit
    return <></>;
  }
  const speeding = Math.round(props.speed) > props.limit;
  return props.units === 'imperial' ? (
    <SpeedLimitMph limit={props.limit} ref={ref} />
  ) : (
    <SpeedLimitKph limit={props.limit} speeding={speeding} ref={ref} />
  );
});

const SpeedLimitMph = forwardRef((props: { limit: number }, ref) => (
  <Box
    boxShadow={'0 0 2px 0 #0008'}
    padding={0.25}
    borderRadius={'0.5em'}
    sx={{ backgroundColor: 'white' }}
    ref={ref}
  >
    <Box
      border={2}
      borderColor={'common.black'}
      padding={0.5}
      paddingBottom={0}
      borderRadius={'0.5em'}
    >
      <Typography
        textAlign={'center'}
        lineHeight={1.2}
        level={'body-xs'}
        sx={{ color: 'common.black' }}
      >
        HIZ
        <br />
        SINIRI
      </Typography>
      <Typography
        textAlign={'center'}
        level={'title-lg'}
        fontSize={'xl2'}
        fontWeight={'bold'}
        sx={{
          color: 'common.black',
          WebkitTextStroke: 1.25,
        }}
      >
        {props.limit < 5 ? '--' : props.limit}
      </Typography>
    </Box>
  </Box>
));

const SpeedLimitKph = forwardRef(
  (props: { limit: number; speeding: boolean }, ref) => {
    const ring = props.speeding ? '#fff' : '#f22';
    return (
      <Box
        boxShadow={
          props.speeding ? '0 0 12px 4px #ff1744cc' : '0 0 2px 0 #0004'
        }
        padding={0.2}
        borderRadius={'50%'}
        border={1}
        borderColor={ring}
        minWidth={'4em'}
        sx={{
          backgroundColor: props.speeding ? '#ff1744' : 'white',
          transition: 'background-color 0.2s, box-shadow 0.2s',
        }}
        ref={ref}
      >
        <Box
          display={'flex'}
          alignItems={'center'}
          justifyContent={'center'}
          border={6}
          borderColor={ring}
          padding={1}
          borderRadius={'50%'}
          sx={{
            aspectRatio: 1,
          }}
        >
          <Typography
            textAlign={'center'}
            level={'title-lg'}
            fontSize={'xl2'}
            fontWeight={'bold'}
            sx={{
              color: props.speeding ? 'white' : 'common.black',
              WebkitTextStroke: 1.25,
            }}
          >
            {props.limit}
          </Typography>
        </Box>
      </Box>
    );
  },
);
