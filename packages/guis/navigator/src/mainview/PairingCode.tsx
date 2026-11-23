import { Box, Link, Stack, Typography } from '@mui/joy';

export interface PairingCodeProps {
  reconnected: boolean;
  pairingCode: string;
  navigatorUrl: string;
  onNavigatorUrlClick: () => void;
}

export const PairingCode = (props: PairingCodeProps) => {
  const { reconnected, pairingCode, navigatorUrl, onNavigatorUrlClick } = props;
  return (
    <Stack
      flex={1}
      gap={2}
      sx={{
        height: '100%',
      }}
    >
      <Typography fontSize={'sm'} sx={{ color: 'neutral.500' }}>
        {reconnected ? 'Başka bir cihaz bağlamak için telefonda' : 'Telefonda'}{' '}
        <Link onClick={onNavigatorUrlClick}>{navigatorUrl}</Link> adresini açıp
        şu eşleştirme&nbsp;kodunu&nbsp;girin:
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexGrow: 1,
          alignSelf: 'center',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          level={'h1'}
          fontFamily={'monospace'}
          sx={{
            cursor: 'text',
            userSelect: 'text',
            fontSize: '5em',
            letterSpacing: '0.1em',
            paddingBottom: '1ex',
          }}
        >
          {pairingCode}
        </Typography>
      </Box>
    </Stack>
  );
};
