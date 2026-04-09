import io
import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from rembg import remove, new_session
from PIL import Image

app = FastAPI()

# Configuration CORS pour ton app Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Chargement UNIQUE du modèle ISNet (le plus performant)
# Il sera téléchargé automatiquement au premier lancement (~180 Mo)
print("Chargement du modèle ISNet haute précision...")
session_isnet = new_session("isnet-general-use")

@app.post("/remove-bg")
async def remove_background(image: UploadFile = File(...)):
    try:
        # 1. Lecture de l'image
        contents = await image.read()
        input_image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # 2. Exécution du détourage dans un thread séparé
        def process():
            return remove(
                input_image,
                session=session_isnet,
                alpha_matting=True,
                # Paramètres calibrés pour ISNet
                alpha_matting_foreground_threshold=240, 
                alpha_matting_background_threshold=15,
                alpha_matting_erode_size=7 # Compromis idéal pour objets et humains
            )

        print("Traitement ISNet en cours...")
        output_image = await run_in_threadpool(process)
        
        # 3. Préparation du flux de sortie
        img_byte_arr = io.BytesIO()
        output_image.save(img_byte_arr, format='PNG')
        
        return Response(content=img_byte_arr.getvalue(), media_type="image/png")

    except Exception as e:
        print(f"Erreur : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)