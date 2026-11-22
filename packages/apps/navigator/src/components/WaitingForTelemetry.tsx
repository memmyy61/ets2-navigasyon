import SyncProblemIcon from '@mui/icons-material/SyncProblem';
import {
  Button,
  Card,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/joy';

export type WaitingForTelemetryState = 'awaiting' | 'orphaned' | 'lost';

export const WaitingForTelemetry = (props: {
  state: WaitingForTelemetryState;
  onRePair: () => void;
}) => {
  const { state, onRePair } = props;

  return (
    <Stack
      justifyContent={'center'}
      alignItems={'center'}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        zIndex: 9999,
      }}
      bgcolor={'#0005'}
    >
      <Card
        size={'lg'}
        sx={{ boxShadow: 'lg', overflow: 'hidden', maxWidth: '40ch' }}
      >
        <Typography
          fontSize={'lg'}
          display={'flex'}
          justifyContent={'center'}
          alignItems={'center'}
          gap={1}
        >
          {state === 'lost' ? (
            <SyncProblemIcon color={'warning'} sx={{ mr: 1 }} />
          ) : (
            <CircularProgress
              variant="solid"
              size={'sm'}
              color={'neutral'}
              sx={{ mr: 1 }}
            />
          )}
          {titleFor(state)}
        </Typography>
        <Divider />
        {state === 'lost' ? (
          <Typography fontSize={'sm'} color={'neutral'}>
            Oyundan veya telemetri istemcisinden veri gelmiyor. Veri gelmeye
            başlayınca bu mesaj kaybolur.
          </Typography>
        ) : (
          <Typography component={'div'} fontSize={'sm'} color={'neutral'}>
            Şunları kontrol edin:
            <ul style={{ paddingLeft: '1.5em', margin: '1ex 0 0 0' }}>
              <li>ETS2 açık</li>
              <li>PC'de BASLAT.bat (telemetri istemcisi) çalışıyor</li>
              <li>kamyonunuz yolda</li>
            </ul>
          </Typography>
        )}
        {state !== 'awaiting' && (
          <Stack>
            <Typography fontSize={'sm'} color={'neutral'}>
              {state === 'lost' ? (
                <>
                  Olmazsa <b>Tekrar dene</b> ile yenileyin veya{' '}
                  <b>Eşleştirme kodu gir</b> ile başka istemciye bağlanın.
                </>
              ) : (
                <>
                  <b>Tekrar dene</b> ile yeniden bağlanın veya{' '}
                  <b>Eşleştirme kodu gir</b> ile baştan başlayın.
                </>
              )}
            </Typography>
            <Stack
              direction={'row'}
              spacing={1}
              justifyContent={'flex-end'}
              sx={{ mt: 2 }}
            >
              <Button
                variant={'outlined'}
                color={'neutral'}
                onClick={() => window.location.reload()}
              >
                Tekrar dene
              </Button>
              <Button variant={'solid'} color={'primary'} onClick={onRePair}>
                Eşleştirme kodu gir
              </Button>
            </Stack>
          </Stack>
        )}
      </Card>
    </Stack>
  );
};

function titleFor(state: WaitingForTelemetryState): string {
  switch (state) {
    case 'awaiting':
      return 'Oyun verisi bekleniyor...';
    case 'orphaned':
      return 'Hâlâ oyun verisi bekleniyor...';
    case 'lost':
      return 'Oyun verisi kesildi';
  }
}
