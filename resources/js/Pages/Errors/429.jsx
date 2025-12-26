import GenericError from './Generic';

export default function Error429() {
  return <GenericError status={429} />;
}