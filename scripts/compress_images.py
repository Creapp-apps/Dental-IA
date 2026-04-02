#!/usr/bin/env python3
"""
Script de compresión de imágenes para Consultorio Alvarez.
Reduce el peso de imágenes grandes (>5MB) manteniendo calidad aceptable.

Uso:
  python compress_images.py <ruta_imagen_o_carpeta> [opciones]

Ejemplos:
  python compress_images.py foto.jpg
  python compress_images.py ./imagenes/
  python compress_images.py foto.png --max-size 2 --quality 70
  python compress_images.py ./fotos/ --output ./comprimidas/ --format webp
"""

import os
import sys
import argparse
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("❌ Pillow no está instalado. Ejecuta:")
    print("   pip install Pillow")
    sys.exit(1)


# ── Constantes ──────────────────────────────────────────────
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}
DEFAULT_MAX_SIZE_MB = 5
DEFAULT_QUALITY = 80
DEFAULT_MAX_DIMENSION = 2048  # px máximo por lado


def get_file_size_mb(filepath: str) -> float:
    """Retorna el tamaño del archivo en MB."""
    return os.path.getsize(filepath) / (1024 * 1024)


def format_size(size_mb: float) -> str:
    """Formatea el tamaño para mostrar."""
    if size_mb < 1:
        return f"{size_mb * 1024:.0f} KB"
    return f"{size_mb:.2f} MB"


def compress_image(
    input_path: str,
    output_path: str,
    max_size_mb: float = DEFAULT_MAX_SIZE_MB,
    quality: int = DEFAULT_QUALITY,
    max_dimension: int = DEFAULT_MAX_DIMENSION,
    output_format: str = None,
) -> dict:
    """
    Comprime una imagen reduciendo dimensiones y calidad.

    Args:
        input_path: Ruta de la imagen original
        output_path: Ruta donde guardar la imagen comprimida
        max_size_mb: Tamaño máximo objetivo en MB
        quality: Calidad de compresión (1-100)
        max_dimension: Dimensión máxima (ancho o alto) en px
        output_format: Formato de salida (jpg, png, webp). None = mantener original

    Returns:
        dict con información del resultado
    """
    original_size = get_file_size_mb(input_path)

    img = Image.open(input_path)
    original_dimensions = img.size

    # Convertir RGBA a RGB si vamos a guardar como JPEG
    target_format = output_format or Path(input_path).suffix.lower().replace(".", "")
    if target_format in ("jpg", "jpeg"):
        if img.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            background.paste(img, mask=img.split()[-1] if "A" in img.mode else None)
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")

    # 1. Redimensionar si excede max_dimension
    width, height = img.size
    if width > max_dimension or height > max_dimension:
        ratio = min(max_dimension / width, max_dimension / height)
        new_size = (int(width * ratio), int(height * ratio))
        img = img.resize(new_size, Image.LANCZOS)

    # 2. Guardar con compresión
    save_kwargs = {}
    ext = target_format.lower()

    if ext in ("jpg", "jpeg"):
        save_kwargs = {
            "format": "JPEG",
            "quality": quality,
            "optimize": True,
        }
        if not output_path.lower().endswith((".jpg", ".jpeg")):
            output_path = str(Path(output_path).with_suffix(".jpg"))
    elif ext == "png":
        save_kwargs = {
            "format": "PNG",
            "optimize": True,
        }
        # Para PNG, reducimos la paleta de colores si es muy grande
        if original_size > max_size_mb:
            img = img.quantize(colors=256, method=Image.Quantize.MEDIANCUT).convert(
                "RGB" if img.mode == "RGB" else "RGBA"
            )
    elif ext == "webp":
        save_kwargs = {
            "format": "WEBP",
            "quality": quality,
            "optimize": True,
        }
        if not output_path.lower().endswith(".webp"):
            output_path = str(Path(output_path).with_suffix(".webp"))
    else:
        save_kwargs = {
            "quality": quality,
            "optimize": True,
        }

    # Crear directorio de salida si no existe
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    img.save(output_path, **save_kwargs)

    # 3. Si todavía es muy grande (solo para JPEG/WEBP), reducir calidad progresivamente
    if ext in ("jpg", "jpeg", "webp"):
        current_quality = quality
        while get_file_size_mb(output_path) > max_size_mb and current_quality > 20:
            current_quality -= 10
            save_kwargs["quality"] = current_quality
            img.save(output_path, **save_kwargs)

    compressed_size = get_file_size_mb(output_path)
    reduction = ((original_size - compressed_size) / original_size) * 100 if original_size > 0 else 0

    return {
        "input": input_path,
        "output": output_path,
        "original_size": original_size,
        "compressed_size": compressed_size,
        "reduction_percent": reduction,
        "original_dimensions": original_dimensions,
        "new_dimensions": img.size,
    }


def find_images(path: str, min_size_mb: float = 0) -> list:
    """Encuentra imágenes en una ruta (archivo o carpeta)."""
    path = Path(path)
    images = []

    if path.is_file():
        if path.suffix.lower() in SUPPORTED_EXTENSIONS:
            if min_size_mb == 0 or get_file_size_mb(str(path)) >= min_size_mb:
                images.append(str(path))
    elif path.is_dir():
        for ext in SUPPORTED_EXTENSIONS:
            for img_path in path.rglob(f"*{ext}"):
                if min_size_mb == 0 or get_file_size_mb(str(img_path)) >= min_size_mb:
                    images.append(str(img_path))
            # También buscar extensiones en mayúscula
            for img_path in path.rglob(f"*{ext.upper()}"):
                if str(img_path) not in images:
                    if min_size_mb == 0 or get_file_size_mb(str(img_path)) >= min_size_mb:
                        images.append(str(img_path))

    return sorted(images)


def print_result(result: dict):
    """Imprime el resultado de una compresión de forma legible."""
    emoji = "✅" if result["reduction_percent"] > 0 else "⚠️"
    print(f"\n{emoji} {Path(result['input']).name}")
    print(f"   📁 Original:   {format_size(result['original_size'])} ({result['original_dimensions'][0]}x{result['original_dimensions'][1]})")
    print(f"   📦 Comprimido: {format_size(result['compressed_size'])} ({result['new_dimensions'][0]}x{result['new_dimensions'][1]})")
    print(f"   📉 Reducción:  {result['reduction_percent']:.1f}%")
    print(f"   💾 Guardado:   {result['output']}")


def main():
    parser = argparse.ArgumentParser(
        description="🦷 Compresor de imágenes para Consultorio Alvarez",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  %(prog)s foto.jpg                          Comprimir una imagen
  %(prog)s ./imagenes/                       Comprimir toda una carpeta
  %(prog)s foto.png --quality 70             Comprimir con calidad 70%%
  %(prog)s foto.png --format webp            Convertir a WebP (mejor compresión)
  %(prog)s ./fotos/ --output ./comprimidas/  Guardar en carpeta separada
  %(prog)s ./fotos/ --max-size 2             Solo procesar archivos >2MB
  %(prog)s ./fotos/ --max-dim 1024           Redimensionar a máximo 1024px
  %(prog)s foto.jpg --overwrite              Sobreescribir el archivo original
        """,
    )
    parser.add_argument("path", help="Archivo o carpeta con imágenes a comprimir")
    parser.add_argument("--output", "-o", help="Carpeta de salida (por defecto: ./compressed/)")
    parser.add_argument("--quality", "-q", type=int, default=DEFAULT_QUALITY, help=f"Calidad de compresión 1-100 (default: {DEFAULT_QUALITY})")
    parser.add_argument("--max-size", "-s", type=float, default=DEFAULT_MAX_SIZE_MB, help=f"Solo procesar archivos mayores a N MB (default: {DEFAULT_MAX_SIZE_MB})")
    parser.add_argument("--max-dim", "-d", type=int, default=DEFAULT_MAX_DIMENSION, help=f"Dimensión máxima en px (default: {DEFAULT_MAX_DIMENSION})")
    parser.add_argument("--format", "-f", choices=["jpg", "png", "webp"], help="Formato de salida (default: mantener original)")
    parser.add_argument("--overwrite", action="store_true", help="Sobreescribir archivos originales")
    parser.add_argument("--all", action="store_true", help="Procesar TODAS las imágenes sin importar el tamaño")

    args = parser.parse_args()

    if not os.path.exists(args.path):
        print(f"❌ La ruta '{args.path}' no existe.")
        sys.exit(1)

    # Buscar imágenes
    min_size = 0 if args.all else args.max_size
    images = find_images(args.path, min_size_mb=min_size)

    if not images:
        if min_size > 0:
            print(f"ℹ️  No se encontraron imágenes mayores a {format_size(min_size)} en '{args.path}'")
            print(f"   Usa --all para procesar todas las imágenes sin importar el tamaño.")
        else:
            print(f"ℹ️  No se encontraron imágenes en '{args.path}'")
        sys.exit(0)

    print(f"\n🦷 Compresor de Imágenes - Consultorio Alvarez")
    print(f"{'─' * 50}")
    print(f"📂 Fuente: {args.path}")
    print(f"🖼️  Imágenes encontradas: {len(images)}")
    print(f"⚙️  Calidad: {args.quality} | Max dimensión: {args.max_dim}px")
    if args.format:
        print(f"🔄 Formato de salida: {args.format.upper()}")

    results = []
    total_original = 0
    total_compressed = 0

    for img_path in images:
        # Determinar ruta de salida
        if args.overwrite:
            output_path = img_path
        elif args.output:
            rel_path = os.path.relpath(img_path, args.path) if os.path.isdir(args.path) else os.path.basename(img_path)
            output_path = os.path.join(args.output, rel_path)
        else:
            if os.path.isdir(args.path):
                rel_path = os.path.relpath(img_path, args.path)
                output_path = os.path.join("compressed", rel_path)
            else:
                name = Path(img_path).stem
                ext = Path(img_path).suffix
                output_path = str(Path(img_path).parent / f"{name}_compressed{ext}")

        try:
            result = compress_image(
                input_path=img_path,
                output_path=output_path,
                max_size_mb=args.max_size,
                quality=args.quality,
                max_dimension=args.max_dim,
                output_format=args.format,
            )
            results.append(result)
            total_original += result["original_size"]
            total_compressed += result["compressed_size"]
            print_result(result)
        except Exception as e:
            print(f"\n❌ Error procesando {img_path}: {e}")

    # Resumen
    if results:
        total_reduction = ((total_original - total_compressed) / total_original * 100) if total_original > 0 else 0
        print(f"\n{'═' * 50}")
        print(f"📊 RESUMEN")
        print(f"{'─' * 50}")
        print(f"   Imágenes procesadas: {len(results)}")
        print(f"   Peso original total: {format_size(total_original)}")
        print(f"   Peso comprimido:     {format_size(total_compressed)}")
        print(f"   Ahorro total:        {format_size(total_original - total_compressed)} ({total_reduction:.1f}%)")
        print(f"{'═' * 50}\n")


if __name__ == "__main__":
    main()
