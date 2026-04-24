import os
import random
import tkinter as tk
from tkinter import ttk
from PIL import Image, ImageTk, ImageChops

class SpriteViewerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Real-Time Sprite Creator Pro")
        self.root.geometry("1100x850") 
        
        self.is_spinning = False
        self.is_wandering = False

        self.char_x = 400
        self.char_y = 400
        self.dx = 0
        self.dy = 0
        self.steps_remaining = 0

        # Movement Mapping (X, Y)
        # -Y is Up, +Y is Down, -X is Left, +X is Right
        self.angle_vectors = {
            "000": (0, 1),    # South (Facing forward, moves Down)
            "045": (1, 1),    # South-East (Down-Right)
            "090": (1, 0),    # East (Right)
            "135": (1, -1),   # North-East (Up-Right)
            "180": (0, -1),   # North (Facing away, moves Up)
            "225": (-1, -1),  # North-West (Up-Left)
            "270": (-1, 0),   # West (Left)
            "315": (-1, 1)    # South-West (Down-Left)
        }

        self.folders = {
            "base": "BASE",
            "outfits": "OUTFITS",
            "hats": "HATSHEADWEAR",
            "weapons": "WEAPONSHOLDING",
            "facial": "FACIAL"
        }
        self.angles = ["000", "045", "090", "135", "180", "225", "270", "315"]
        self.current_angle = tk.StringVar(value="000")
        self.default_layers = ["Hat", "Facial", "Weapon", "Outfit", "Base"]

        self.setup_ui()
        self.refresh_folders()
        self.root.update_idletasks() 

    def setup_ui(self):
        # --- LEFT PANEL (Controls) ---
        control_frame = tk.Frame(self.root, width=350, padx=10, pady=5)
        control_frame.pack(side=tk.LEFT, fill=tk.Y)

        comp_frame = tk.LabelFrame(control_frame, text="Equip Components", padx=5, pady=5)
        comp_frame.pack(fill=tk.X, pady=(0, 5))

        tk.Label(comp_frame, text="Outfit:").pack(anchor=tk.W)
        self.combo_outfit = ttk.Combobox(comp_frame, state="readonly")
        self.combo_outfit.pack(fill=tk.X)
        self.combo_outfit.bind("<<ComboboxSelected>>", self.update_preview)

        tk.Label(comp_frame, text="Weapon:").pack(anchor=tk.W)
        self.combo_weapon = ttk.Combobox(comp_frame, state="readonly")
        self.combo_weapon.pack(fill=tk.X)
        self.combo_weapon.bind("<<ComboboxSelected>>", self.update_preview)

        tk.Label(comp_frame, text="Headwear:").pack(anchor=tk.W)
        self.combo_hat = ttk.Combobox(comp_frame, state="readonly")
        self.combo_hat.pack(fill=tk.X)
        self.combo_hat.bind("<<ComboboxSelected>>", self.update_preview)

        tk.Label(comp_frame, text="Facial:").pack(anchor=tk.W)
        self.combo_facial = ttk.Combobox(comp_frame, state="readonly")
        self.combo_facial.pack(fill=tk.X)
        self.combo_facial.bind("<<ComboboxSelected>>", self.update_preview)

        layer_frame = tk.LabelFrame(control_frame, text="Layer Order (Top to Bottom)", padx=5, pady=5)
        layer_frame.pack(fill=tk.X, pady=(0, 5))

        self.layer_listbox = tk.Listbox(layer_frame, height=5, selectmode=tk.SINGLE, font=("Arial", 10))
        self.layer_listbox.pack(side=tk.LEFT, fill=tk.X, expand=True)
        for layer in self.default_layers:
            self.layer_listbox.insert(tk.END, layer)
        self.layer_listbox.bind("<<ListboxSelect>>", lambda e: self.update_preview())

        btn_frame = tk.Frame(layer_frame)
        btn_frame.pack(side=tk.RIGHT, padx=5)
        tk.Button(btn_frame, text="▲ Up", command=self.move_layer_up, width=6).pack(pady=2)
        tk.Button(btn_frame, text="▼ Down", command=self.move_layer_down, width=6).pack(pady=2)

        color_frame = tk.LabelFrame(control_frame, text="Base Layer RGB Tint", padx=5, pady=5)
        color_frame.pack(fill=tk.X, pady=(0, 5))

        self.r_var, self.g_var, self.b_var = tk.IntVar(value=255), tk.IntVar(value=224), tk.IntVar(value=189)
        tk.Scale(color_frame, variable=self.r_var, from_=0, to=255, orient=tk.HORIZONTAL, command=self.update_preview, bg="#ffcccc").pack(fill=tk.X)
        tk.Scale(color_frame, variable=self.g_var, from_=0, to=255, orient=tk.HORIZONTAL, command=self.update_preview, bg="#ccffcc").pack(fill=tk.X)
        tk.Scale(color_frame, variable=self.b_var, from_=0, to=255, orient=tk.HORIZONTAL, command=self.update_preview, bg="#ccccff").pack(fill=tk.X)

        angle_frame = tk.LabelFrame(control_frame, text="Viewing Angle", padx=5, pady=5)
        angle_frame.pack(fill=tk.X, pady=(0, 5))
        
        inner_angle_frame = tk.Frame(angle_frame)
        inner_angle_frame.pack(fill=tk.X)
        for i, angle in enumerate(self.angles):
            row, col = i // 4, i % 4
            tk.Radiobutton(inner_angle_frame, text=angle, variable=self.current_angle, value=angle, command=self.update_preview).grid(row=row, column=col, sticky=tk.W)

        # --- ZOOM & SPEED SLIDERS ---
        slider_frame = tk.Frame(control_frame)
        slider_frame.pack(fill=tk.X, pady=(5, 0))

        tk.Label(slider_frame, text="Zoom Level (0.25x - 5x):").pack(anchor=tk.W)
        self.zoom_slider = tk.Scale(slider_frame, from_=0.25, to=5.0, resolution=0.25, orient=tk.HORIZONTAL, command=self.update_preview)
        self.zoom_slider.set(1.0)
        self.zoom_slider.pack(fill=tk.X)

        tk.Label(slider_frame, text="Wander Speed:").pack(anchor=tk.W, pady=(5, 0))
        self.speed_slider = tk.Scale(slider_frame, from_=1, to=30, orient=tk.HORIZONTAL)
        self.speed_slider.set(10)
        self.speed_slider.pack(fill=tk.X)

        # --- ANIMATION BUTTONS ---
        anim_frame = tk.Frame(control_frame)
        anim_frame.pack(fill=tk.X, pady=(10, 0))

        self.spin_button = tk.Button(anim_frame, text="↻ Spin", command=self.toggle_spin, bg="#4CAF50", fg="white", font=("Arial", 10, "bold"))
        self.spin_button.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 2))

        self.wander_button = tk.Button(anim_frame, text="🚶 Wander", command=self.toggle_wander, bg="#9C27B0", fg="white", font=("Arial", 10, "bold"))
        self.wander_button.pack(side=tk.RIGHT, fill=tk.X, expand=True, padx=(2, 0))

        # --- EXPORT & REFRESH ---
        self.export_button = tk.Button(control_frame, text="💾 Export Sprite Sheet/GIF", command=self.export_gif, bg="#2196F3", fg="white", font=("Arial", 10, "bold"))
        self.export_button.pack(fill=tk.X, pady=(10, 0))
        
        self.status_label = tk.Label(control_frame, text="", fg="green")
        self.status_label.pack()

        btn_refresh = tk.Button(control_frame, text="↻ Refresh Folders", command=self.refresh_folders, bg="#e0e0e0")
        btn_refresh.pack(side=tk.BOTTOM, fill=tk.X)

        # --- RIGHT PANEL (2D Game Canvas) ---
        preview_frame = tk.Frame(self.root, bg="#1e1e1e", bd=2, relief=tk.SUNKEN)
        preview_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        self.canvas = tk.Canvas(preview_frame, bg="#1e1e1e", highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)

    def move_layer_up(self):
        idx = self.layer_listbox.curselection()
        if not idx or idx[0] == 0: return 
        val = self.layer_listbox.get(idx[0])
        self.layer_listbox.delete(idx[0])
        self.layer_listbox.insert(idx[0] - 1, val)
        self.layer_listbox.selection_set(idx[0] - 1)
        self.update_preview()

    def move_layer_down(self):
        idx = self.layer_listbox.curselection()
        if not idx or idx[0] == self.layer_listbox.size() - 1: return 
        val = self.layer_listbox.get(idx[0])
        self.layer_listbox.delete(idx[0])
        self.layer_listbox.insert(idx[0] + 1, val)
        self.layer_listbox.selection_set(idx[0] + 1)
        self.update_preview()

    def toggle_spin(self):
        self.is_spinning = not self.is_spinning
        if self.is_spinning:
            if self.is_wandering: self.toggle_wander() 
            self.spin_button.config(text="⏹ Stop Spin", bg="#f44336")
            self.spin_step()
        else:
            self.spin_button.config(text="↻ Spin", bg="#4CAF50")

    def spin_step(self):
        if self.is_spinning:
            current_idx = self.angles.index(self.current_angle.get())
            next_idx = (current_idx + 1) % len(self.angles)
            self.current_angle.set(self.angles[next_idx])
            self.update_preview()
            self.root.after(150, self.spin_step)

    def toggle_wander(self):
        self.is_wandering = not self.is_wandering
        if self.is_wandering:
            if self.is_spinning: self.toggle_spin() 
            self.wander_button.config(text="⏹ Stop Wander", bg="#f44336")
            self.steps_remaining = 0 
            self.wander_step()
        else:
            self.wander_button.config(text="🚶 Wander", bg="#9C27B0")

    def wander_step(self):
        if not self.is_wandering: return

        canvas_w = self.canvas.winfo_width()
        canvas_h = self.canvas.winfo_height()
        speed = self.speed_slider.get()
        
        # Pick new direction if step count runs out
        if self.steps_remaining <= 0:
            new_angle = random.choice(self.angles)
            self.current_angle.set(new_angle)
            self.dx, self.dy = self.angle_vectors[new_angle]
            self.steps_remaining = random.randint(15, 60) 
            
        self.char_x += self.dx * speed
        self.char_y += self.dy * speed
        
        # Screen Edges Collision (Hit a wall)
        hit_wall = False
        padding = 40 * self.zoom_slider.get() 
        if self.char_x < padding or self.char_x > canvas_w - padding:
            self.char_x -= self.dx * speed # Step back
            hit_wall = True
        if self.char_y < padding or self.char_y > canvas_h - padding:
            self.char_y -= self.dy * speed # Step back
            hit_wall = True
            
        if hit_wall:
            self.steps_remaining = 0 # Force immediate turn
            
        self.steps_remaining -= 1
        self.update_preview()
        
        # Frame rate of the wander loop
        self.root.after(50, self.wander_step)

    def refresh_folders(self):
        def get_prefixes(folder):
            if not os.path.exists(folder): return []
            return [f.rsplit("_", 1)[0] for f in os.listdir(folder) if f.endswith("000.png")]

        self.outfits = ["None"] + get_prefixes(self.folders["outfits"])
        self.hats = ["None"] + get_prefixes(self.folders["hats"])
        self.weapons = ["None"] + get_prefixes(self.folders["weapons"])
        self.facials = ["None"] + get_prefixes(self.folders["facial"])

        self.combo_outfit['values'] = [o.replace("OUTFITS_", "") for o in self.outfits]
        self.combo_hat['values'] = [h.replace("HATSHEADWEAR_", "") for h in self.hats]
        self.combo_weapon['values'] = [w.replace("WEAPONSHOLDING_", "") for w in self.weapons]
        self.combo_facial['values'] = [f.replace("FACIAL_", "") for f in self.facials]

        self.combo_outfit.current(0)
        self.combo_hat.current(0)
        self.combo_weapon.current(0)
        self.combo_facial.current(0)

        self.update_preview()

    def process_layer_stack(self, angle):
        loaded_layers = {}

        try:
            img_base_raw = Image.open(os.path.join(self.folders["base"], f"BASE_{angle}.png")).convert("RGBA")
            r_val, g_val, b_val = self.r_var.get(), self.g_var.get(), self.b_var.get()
            r, g, b, a = img_base_raw.split()
            base_rgb = Image.merge("RGB", (r, g, b))
            solid_color = Image.new("RGB", img_base_raw.size, (r_val, g_val, b_val))
            tinted_base = ImageChops.multiply(base_rgb, solid_color)
            img_base = tinted_base.convert("RGBA")
            img_base.putalpha(a)
            loaded_layers["Base"] = img_base
        except FileNotFoundError:
            return None 

        def load_optional_layer(layer_name, folder_key, combo_box, prefix_list):
            idx = combo_box.current()
            if idx > 0: 
                filename = f"{prefix_list[idx]}_{angle}.png"
                try:
                    loaded_layers[layer_name] = Image.open(os.path.join(self.folders[folder_key], filename)).convert("RGBA")
                except FileNotFoundError:
                    pass

        load_optional_layer("Outfit", "outfits", self.combo_outfit, self.outfits)
        load_optional_layer("Weapon", "weapons", self.combo_weapon, self.weapons)
        load_optional_layer("Hat", "hats", self.combo_hat, self.hats)
        load_optional_layer("Facial", "facial", self.combo_facial, self.facials)

        current_listbox_order = self.layer_listbox.get(0, tk.END)
        render_order = reversed(current_listbox_order)

        comp = Image.new("RGBA", loaded_layers["Base"].size, (0, 0, 0, 0))

        for layer_name in render_order:
            if layer_name in loaded_layers:
                comp = Image.alpha_composite(comp, loaded_layers[layer_name])

        return comp

    def update_preview(self, event=None):
        comp = self.process_layer_stack(self.current_angle.get())
        self.canvas.delete("all")

        if comp:
            current_zoom = self.zoom_slider.get()
            
            # Using max(1, ...) prevents the app from crashing if zoom goes too small
            new_w = max(1, int(comp.width * current_zoom))
            new_h = max(1, int(comp.height * current_zoom))
            
            comp = comp.resize((new_w, new_h), Image.Resampling.NEAREST)

            self.preview_image = ImageTk.PhotoImage(comp)
            self.canvas.create_image(self.char_x, self.char_y, image=self.preview_image, anchor=tk.CENTER)
        else:
            self.canvas.create_text(self.canvas.winfo_width()/2, self.canvas.winfo_height()/2, 
                                    text=f"Missing Base Layer for angle {self.current_angle.get()}", fill="white")
            
        self.status_label.config(text="") 

    def export_gif(self):
        self.status_label.config(text="Exporting...", fg="orange")
        self.root.update() 

        export_dir = "EXPORTS"
        if not os.path.exists(export_dir):
            os.makedirs(export_dir)

        frames = []
        broken = False

        for angle in self.angles:
            comp = self.process_layer_stack(angle)
            if comp:
                frames.append(comp)
            else:
                broken = True
                break
        
        if not broken and len(frames) == 8:
            o_name = self.combo_outfit.get()
            h_name = self.combo_hat.get()
            w_name = self.combo_weapon.get()
            f_name = self.combo_facial.get()
            rgb_str = f"{self.r_var.get()}-{self.g_var.get()}-{self.b_var.get()}"
            
            gif_name = f"CHAR_O[{o_name}]_H[{h_name}]_W[{w_name}]_F[{f_name}]_RGB[{rgb_str}].gif"
            gif_path = os.path.join(export_dir, gif_name)

            frames[0].save(
                gif_path,
                format='GIF',
                save_all=True,
                append_images=frames[1:],
                duration=150,
                loop=0,
                disposal=2,
                transparency=0
            )
            self.status_label.config(text=f"Saved to EXPORTS folder!", fg="green")
        else:
            self.status_label.config(text="Failed: Missing files for this combo.", fg="red")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    root = tk.Tk()
    app = SpriteViewerApp(root)
    root.mainloop()