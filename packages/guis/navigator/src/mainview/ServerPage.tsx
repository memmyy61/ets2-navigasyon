import { Button, LinearProgress, Stack, Typography } from '@mui/joy';
import type { ImportProgress, ServerState } from '../bun/types';

/**
 * ETS2 Navigasyon: shown until the local navigation server is ready:
 * missing map data (import it from Ubuntu), importing, starting, or error.
 */
export const ServerPage = (props: {
  serverState: ServerState | undefined;
  importProgress: ImportProgress | undefined;
  onImport: (source: string) => void;
  onOpenDataFolder: () => void;
}) => {
  const { serverState, importProgress } = props;

  if (serverState == null || serverState.state === 'starting') {
    return (
      <Stack sx={{ p: 4, flex: 1 }} gap={2} alignItems={'center'}>
        <Typography level={'title-lg'}>Sunucu başlatılıyor...</Typography>
        <Typography level={'body-sm'} color={'neutral'}>
          Harita verisi belleğe yükleniyor, bu 1-2 dakika sürebilir.
        </Typography>
        <LinearProgress color={'neutral'} size={'lg'} sx={{ width: '80%' }} />
      </Stack>
    );
  }

  if (serverState.state === 'importing') {
    const pct =
      importProgress && importProgress.totalBytes > 0
        ? (importProgress.copiedBytes / importProgress.totalBytes) * 100
        : 0;
    const gb = (bytes: number) => (bytes / 1024 ** 3).toFixed(2);
    return (
      <Stack sx={{ p: 4, flex: 1 }} gap={2} alignItems={'center'}>
        <Typography level={'title-lg'}>
          Harita verisi kopyalanıyor...
        </Typography>
        <LinearProgress
          determinate
          value={pct}
          size={'lg'}
          sx={{ width: '80%' }}
        />
        {importProgress && (
          <Typography level={'body-sm'} color={'neutral'}>
            {gb(importProgress.copiedBytes)} / {gb(importProgress.totalBytes)}{' '}
            GB {importProgress.file && `· ${importProgress.file}`}
          </Typography>
        )}
      </Stack>
    );
  }

  if (serverState.state === 'error') {
    return (
      <Stack sx={{ p: 4, flex: 1 }} gap={2} alignItems={'center'}>
        <Typography level={'title-lg'} color={'danger'}>
          Sunucu başlatılamadı
        </Typography>
        <Typography level={'body-md'} sx={{ userSelect: 'text' }}>
          {serverState.message}
        </Typography>
      </Stack>
    );
  }

  // noData
  return (
    <Stack sx={{ p: 2, flex: 1 }} gap={1.5}>
      <Typography level={'title-lg'}>Harita verisi gerekli</Typography>
      <Typography level={'body-sm'}>
        Uygulama, Ubuntu'da (WSL) ürettiğimiz harita verisini bir kez kendi
        klasörüne kopyalar. Bu işlem birkaç dakika sürebilir; sonra Ubuntu'ya
        ihtiyaç kalmaz.
      </Typography>
      {serverState.message && (
        <Typography level={'body-sm'} color={'danger'}>
          {serverState.message}
        </Typography>
      )}
      {serverState.dataSources.length > 0 ? (
        serverState.dataSources.map(source => (
          <Stack key={source} direction={'row'} gap={1} alignItems={'center'}>
            <Button onClick={() => props.onImport(source)}>Kopyala</Button>
            <Typography
              level={'body-xs'}
              sx={{ userSelect: 'text', wordBreak: 'break-all' }}
            >
              {source}
            </Typography>
          </Stack>
        ))
      ) : (
        <Typography level={'body-sm'} color={'warning'}>
          Ubuntu'da harita verisi bulunamadı (~/ets2-navigasyon/out). Ubuntu
          kurulu ve veri üretilmiş olmalı.
        </Typography>
      )}
      <Button
        variant={'plain'}
        size={'sm'}
        sx={{ alignSelf: 'flex-start' }}
        onClick={props.onOpenDataFolder}
      >
        Veri klasörünü aç
      </Button>
    </Stack>
  );
};
