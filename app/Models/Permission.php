<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    use HasFactory;

    protected $fillable = [
        'module',
        'feature',
        'label',
        'description',
    ];

    /**
     * Get the users that have this permission
     */
    public function users()
    {
        return $this->belongsToMany(User::class, 'user_permissions')
            ->withPivot('granted')
            ->withTimestamps();
    }
}
