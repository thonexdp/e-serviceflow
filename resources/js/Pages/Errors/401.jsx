import GenericError from './Generic';

export default function Error401() {
  return <GenericError status={401} />;
}