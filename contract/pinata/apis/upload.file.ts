// (나) 이 파일의 용도는 ./input 폴더에 있는 이미지 파일을 Pinata의 IPFS 서버에 업로드하는 것 
// 이미지 파일 읽고 -> Pinata의 IPFS 업로드 API 호출해서 -> 그 이미지 파일을 IPFS에 업로드 -> 업로드된 이미지의 IPFS URL 리턴해줌
import FormData from 'form-data';
import { jwt } from '../pinata.config';
import { createReadStream } from '../fs';
import axios from 'axios';

export const uploadFileToIPFS = async () => {
    const fileStream = await createReadStream();   // import한 createReadStream()을 호출해 이미지 파일을 스트림 형식으로 읽는다

    const formData = new FormData();   // 새로운 FormData 인스턴스 생성; 업로드할 파일과 추가 정보를 이 객체에 담을 것
    formData.append('file', fileStream);  // 읽어온 이미지 파일 스트림을 file이라는 key로 formData에 추가한다 
    formData.append('name', 'Corn_Image');  // name이라는 key에 'Corn_Image"라는 값을 추가함; 이는 Pinata에서 파일 이름으로 사용됨(필수는 아님)
    formData.append('network', 'public');  // Pinata에서 퍼블릭 네트워크에 업로드 하겠다는 의미 

    // axios.post()로 HTTP POST 요청 보내기 
    const response = await axios.post(
        'https://uploads.pinata.cloud/v3/files',   // 파일 업로드를 위한 Pinata의 엔드포인트; 여기에 요청을 보낸다 
        formData,
        {
            headers: {
                Authorization: `Bearer ${jwt}`,
                ...formData.getHeaders(),
            },
        }
    );

    // 콘솔에 업로드 시작 메세지 출력 
    console.log('이미지를 IPFS에 업로드합니다');
    // 업로드된 이미지의 IPFS URL을 콘솔에 출력한다
    // response.data.data.cid는 Pinata가 반환하는 CID(Content Identifier); 이걸 IPFS Gateway URL로 연결해 볼 수 있게 해주는 형식
    console.log(
        'Image :',
        `https://jade-biological-gamefowl-447.mypinata.cloud/ipfs/${response.data.data.cid}`
    );

    // 업로드된 이미지의 IPFS URL 리턴; 나중에 NFT 메타데이터를 만들거나 화면에 보여줄 때 삳용할 수 있음  
    return `https://jade-biological-gamefowl-447.mypinata.cloud/ipfs/${response.data.data.cid}`;
};
