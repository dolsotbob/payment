// (나) 이 파일 용도: ./input 폴더 안에 있는 이미지 파일을 읽고 검증하고, 그 파일에 대한 스트림을 생성하기 위함 
import fs from 'fs';
import path from 'path';

const basePath = __dirname;
const inputPath = path.join(basePath, './input');

// ./input 폴더에서 .gitkeep을 제외한 나머지 파일을 가져옴; 이미지 파일 2개 이상이면 에러 던짐 
export const getFile = () => {
  const files = fs.readdirSync(inputPath).filter((file) => {
    return file !== '.gitkeep';
  });

  if (files.length > 1) {
    throw new Error('이미지 파일은 하나만 필요합니다.');
  }

  return files;
};

// getFile()로 가져온 이밎 파일 확장자가 png, jpg, jpeg, gif 인지 확인; 아니면 에러 던짐 
export const checkFileExtensions = async () => {
  const fileName = getFile()[0];
  const extentions = fileName.split('.');
  const isValid =
    extentions[extentions.length - 1] === 'png' ||
    extentions[extentions.length - 1] === 'jpg' ||
    extentions[extentions.length - 1] === 'jpeg' ||
    extentions[extentions.length - 1] === 'gif';

  if (!isValid) {
    throw new Error('이미지 파일는 png, jpg, jpeg, gif 파일이어야 합니다.');
  }

  return isValid;
};

// 확장자가 유효한지 확인한 뒤, 그 이미지 파일의 전체 경로를 리턴
export const getPath = async () => {
  await checkFileExtensions();

  return path.join(inputPath, getFile()[0]);
};

// 그 이미지 파일을 읽을 수 있는 read stream을 만들어줌
// 이걸 통해 다른 서버나 서비스로 파일을 전송하거나 처리할 수 있음 
export const createReadStream = async () => {
  return fs.createReadStream(await getPath());
};
