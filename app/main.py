import io
import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from rembg import remove, new_session
from PIL import Image

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Chargement du modèle u2netp léger...")
session = new_session("u2netp")

@app.post("/remove-bg")
async def remove_background(image: UploadFile = File(...)):
    try:
        contents = await image.read()
        input_image = Image.open(io.BytesIO(contents)).convert("RGB")

        def process():
            return remove(
                input_image,
                session=session,
                alpha_matting=False,  # ← désactivé pour économiser RAM
            )

        print("Traitement en cours...")
        output_image = await run_in_threadpool(process)

        img_byte_arr = io.BytesIO()
        output_image.save(img_byte_arr, format='PNG')

        return Response(content=img_byte_arr.getvalue(), media_type="image/png")

    except Exception as e:
        print(f"Erreur : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)