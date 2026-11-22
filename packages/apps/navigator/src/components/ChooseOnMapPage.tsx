import { Button, Card, Stack, Typography } from '@mui/joy';

export interface ChooseOnMapPageProps {
  onUseThisPointClick: () => void;
}

export const ChooseOnMapPage = (props: ChooseOnMapPageProps) => {
  return (
    <Stack direction={'column'} gap={2} flexGrow={1}>
      <Card size={'lg'} variant={'soft'}>
        <Typography level={'body-md'} fontSize={'lg'}>
          Ayarlamak için haritayı kaydırın ve yakınlaştırın
        </Typography>
        <Button size={'lg'} onClick={props.onUseThisPointClick}>
          Tamam
        </Button>
      </Card>
    </Stack>
  );
};
